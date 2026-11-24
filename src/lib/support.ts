import type { CollectionAfterChangeHook, Endpoint, Payload, PayloadRequest } from 'payload'

import { idOf, isPlatformAdmin, roleIn } from '../access'
import { getAdminUrl } from './apps'
import { isPlaceholder } from './placeholder'
import { getPortalUrl } from './site-url'

type Msg = { at: string; authorName?: string | null; fromCiviq?: boolean | null; body: string }
type Ticket = {
  id: number | string
  tenant: unknown
  subject: string
  type: string
  priority: string
  status: string
  description: string
  pageUrl?: string | null
  submittedBy?: unknown
  submittedByName?: string | null
  messages?: Msg[] | null
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const paragraphs = (s: string) => s.split(/\n{2,}/).map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
const validEmail = (s?: string | null) => (s && !isPlaceholder(s) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null)
const fail = (error: string, status: number) => Response.json({ error }, { status })
const TYPE_WORDS: Record<string, string> = { issue: 'Problem', request: 'Change request', question: 'Question', feedback: 'Feedback' }

const portalLink = (id: Ticket['id']) => `${getPortalUrl()}/admin/collections/support-requests/${id}`
const adminLink = (id: Ticket['id']) => `${getAdminUrl() ?? getPortalUrl()}/admin/collections/support-requests/${id}`

/** Where support requests are emailed: "Send support requests to" in Civiq marketing site settings, else lead alerts. */
async function civiqInbox(payload: Payload) {
  const s = await payload.findGlobal({ slug: 'civiq-settings', depth: 0, overrideAccess: true }).catch(() => null)
  return validEmail(s?.supportEmail) ?? validEmail(s?.leadNotifyEmail)
}

const officeName = async (payload: Payload, tenant: unknown) =>
  (await payload.findByID({ collection: 'tenants', id: Number(idOf(tenant)), depth: 0, overrideAccess: true }).catch(() => null))?.name ?? 'A legislator’s office'

const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b2620;max-width:620px">${inner}</div>`
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#0b5d3b;color:#fff;text-decoration:none;font-weight:bold;padding:11px 20px;border-radius:999px;display:inline-block">${esc(label)}</a></p>`

async function emailCiviq(payload: Payload, t: Ticket, heading: string, body: string) {
  const to = await civiqInbox(payload)
  if (!to) return
  const office = await officeName(payload, t.tenant)
  const urgent = t.priority === 'urgent' ? 'URGENT · ' : ''
  await payload
    .sendEmail({
      to,
      subject: `[Civiq support #${t.id}] ${urgent}${TYPE_WORDS[t.type] ?? 'Request'}: ${t.subject} (${office})`,
      html: wrap(
        `<p style="margin:0 0 6px;color:#5b665f;font-size:13px">${esc(office)} · ${esc(TYPE_WORDS[t.type] ?? t.type)}${t.priority === 'urgent' ? ' · <b style="color:#b42318">Urgent</b>' : ''}</p><h2 style="margin:0 0 14px;font-size:18px">${esc(heading)}</h2>${paragraphs(body)}${t.pageUrl ? `<p style="color:#5b665f;font-size:13px">Page: ${esc(t.pageUrl)}</p>` : ''}${button(adminLink(t.id), 'Open in the Civiq Admin')}`,
      ),
    })
    .catch((err: unknown) => payload.logger.error({ err }, 'Support email to Civiq failed'))
}

async function emailOffice(payload: Payload, t: Ticket, heading: string, body: string) {
  const user = t.submittedBy ? await payload.findByID({ collection: 'users', id: Number(idOf(t.submittedBy)), depth: 0, overrideAccess: true }).catch(() => null) : null
  const to = validEmail(user?.email)
  if (!to) return
  await payload
    .sendEmail({
      to,
      subject: `Civiq support #${t.id}: ${t.subject}`,
      html: wrap(`<h2 style="margin:0 0 14px;font-size:18px">${esc(heading)}</h2>${paragraphs(body)}${button(portalLink(t.id), 'View your request')}<p style="color:#5b665f;font-size:13px">Reply from the Civiq Portal so the whole team can follow the conversation.</p>`),
    })
    .catch((err: unknown) => payload.logger.error({ err }, 'Support email to office failed'))
}

/** New request → email the Civiq team. Civiq marks it resolved → email the person who asked. */
export const notifyOnSupportChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const t = doc as Ticket
  if (req.context?.skipSupportEmail) return doc
  if (operation === 'create') {
    await emailCiviq(req.payload, t, `New request from ${t.submittedByName ?? 'the office'}: ${t.subject}`, t.description)
  } else if (previousDoc?.status !== 'resolved' && t.status === 'resolved') {
    await emailOffice(req.payload, t, 'Your request has been resolved', `The Civiq team has marked “${t.subject}” as resolved. If anything is still not right, reply to it in the portal and it will reopen.`)
  }
  return doc
}

/**
 * POST /api/support-requests/:id/reply  { body, status?, resolve? }
 * The office and the Civiq team write to each other on a request; the other side is emailed.
 * Civiq replies set the status (default "Waiting on office"); an office reply reopens a resolved or waiting
 * request, or marks it resolved when `resolve` is true.
 */
export const supportReplyEndpoint: Endpoint = {
  path: '/:id/reply',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const user = req.user as (Parameters<typeof isPlatformAdmin>[0] & { name?: string; email?: string }) | null
    if (!user) return fail('Please log in again.', 401)
    const input = (await req.json?.().catch(() => ({}))) as { body?: string; status?: string; resolve?: boolean }
    const body = String(input.body ?? '').trim().slice(0, 5000)
    // Read with the user's own permissions: only that office's team or the Civiq team get here.
    const t = (await req.payload
      .findByID({ collection: 'support-requests', id: String(req.routeParams?.id ?? ''), depth: 0, overrideAccess: false, req })
      .catch(() => null)) as Ticket | null
    if (!t) return fail('Request not found.', 404)
    const civiq = isPlatformAdmin(user)
    if (!civiq && !roleIn(user, t.tenant)) return fail('Not allowed.', 403)
    if (!body && !input.resolve) return fail('Write a reply first.', 400)

    const now = new Date().toISOString()
    let status = t.status
    if (civiq) {
      const allowed = ['new', 'in-progress', 'waiting', 'resolved']
      status = allowed.includes(String(input.status)) ? String(input.status) : body ? 'waiting' : t.status
    } else if (input.resolve) {
      status = 'resolved'
    } else if (t.status === 'resolved' || t.status === 'waiting') {
      status = t.status === 'resolved' ? 'new' : 'in-progress'
    }
    const messages = [...(t.messages ?? []).map(({ at, authorName, fromCiviq, body: b }) => ({ at, authorName, fromCiviq, body: b }))]
    if (body) messages.push({ at: now, authorName: civiq ? `${user.name ?? 'Civiq'} (Civiq)` : (user.name ?? user.email ?? 'The office'), fromCiviq: civiq, body })

    const updated = (await req.payload.update({
      collection: 'support-requests',
      id: t.id,
      data: { messages, status: status as 'new', lastActivityAt: now },
      overrideAccess: true,
      context: { skipSupportEmail: true }, // emailed below with the reply itself
    })) as unknown as Ticket

    if (civiq && body) {
      await emailOffice(req.payload, updated, status === 'resolved' ? 'The Civiq team replied and resolved your request' : 'The Civiq team replied to your request', body)
    } else if (!civiq) {
      const who = user.name ?? user.email ?? 'The office'
      await emailCiviq(
        req.payload,
        updated,
        input.resolve ? `${who} marked this request resolved` : t.status === 'resolved' ? `${who} reopened this request` : `${who} replied`,
        body || 'Marked as resolved by the office.',
      )
    }
    return Response.json({ ok: true, status, messages: updated.messages ?? [] })
  },
}

/** Open support requests, for the Civiq Admin home. Urgent first, then the longest waiting. */
export async function openSupportRequests(payload: Payload) {
  const r = await payload.find({
    collection: 'support-requests',
    where: { status: { not_equals: 'resolved' } },
    sort: 'lastActivityAt',
    limit: 50,
    depth: 1,
    overrideAccess: true,
  })
  const docs = r.docs.sort((a, b) => Number(b.priority === 'urgent') - Number(a.priority === 'urgent'))
  return { total: r.totalDocs, docs: docs.slice(0, 8) }
}
