import { sql } from '@payloadcms/db-postgres'
import crypto from 'node:crypto'
import type { Endpoint, PayloadRequest } from 'payload'

import type { Newsletter } from '@/payload-types'
import { isPlatformAdmin, roleIn } from '../../access'
import { run } from '../insights'
import { getBranding, newsletterContent, renderEmail, sendBlockers, tenantOf, unsubscribeUrl, validEmail, verifyUnsubscribe, fromAddress } from './render'
import { newsletterStats, processNewsletter, sendBatch, sendingMode, startSending } from './send'

type User = Parameters<typeof isPlatformAdmin>[0] & { name?: string; email?: string }
const SEND_BUDGET_MS = 20_000
const fail = (error: string, status: number) => Response.json({ error }, { status })
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Loads the newsletter with the user's own permissions and checks they are an admin or editor of its office. */
async function loadForTeam(req: PayloadRequest): Promise<{ n: Newsletter; user: User } | Response> {
  const user = req.user as User | null
  if (!user) return fail('Please log in again.', 401)
  const id = String(req.routeParams?.id ?? '')
  const n = await req.payload.findByID({ collection: 'newsletters', id, depth: 1, overrideAccess: false, req }).catch(() => null)
  if (!n) return fail('Newsletter not found.', 404)
  if (!isPlatformAdmin(user) && !['admin', 'editor'].includes(roleIn(user, n.tenant) ?? '')) {
    return fail('Only the team’s admins and editors can send newsletters.', 403)
  }
  return { n, user }
}

const sendingOff = () =>
  sendingMode() === 'off' ? fail('Email sending is not set up yet (no Resend key). Ask the Civiq team to finish email setup.', 503) : null

/** GET /api/newsletters/:id/status — everything the send panel shows. */
const statusEndpoint: Endpoint = {
  path: '/:id/status',
  method: 'get',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return loaded
    const { n } = loaded
    const branding = await getBranding(req.payload, tenantOf(n))
    return Response.json({
      status: n.status,
      scheduledAt: n.scheduledAt ?? null,
      sentAt: n.sentAt ?? null,
      sentByName: n.sentByName ?? null,
      audienceCount: n.audienceCount ?? 0,
      stats: await newsletterStats(req.payload, Number(n.id)),
      blockers: sendBlockers(branding),
      mode: sendingMode(),
      // Vercel's free plan runs scheduled jobs once a day; set NEWSLETTER_CRON_FREQUENT=1 after moving to Pro.
      scheduleNote:
        process.env.NEWSLETTER_CRON_FREQUENT === '1'
          ? null
          : 'Scheduled newsletters go out at the daily run (8:00 am Lagos time) on or after the time you pick.',
    })
  },
}

/** POST /api/newsletters/:id/test — sends the newsletter to the logged-in user only. */
const testEndpoint: Endpoint = {
  path: '/:id/test',
  method: 'post',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return loaded
    const { n, user } = loaded
    const off = sendingOff()
    if (off) return off
    const to = validEmail(user.email)
    if (!to) return fail('Your account has no valid email address to send the test to.', 400)

    const branding = await getBranding(req.payload, tenantOf(n))
    // The test link is real but harmless: it is signed for a non-existent supporter id (0).
    const unsubscribe = unsubscribeUrl(0)
    const { html, text } = renderEmail(n, branding, newsletterContent(n, branding.brand), unsubscribe)
    try {
      await sendBatch(req.payload, [
        { from: fromAddress(branding), to: [to], ...(branding.replyTo ? { reply_to: branding.replyTo } : {}), subject: `[Test] ${n.subject}`, html, text },
      ])
    } catch (err) {
      req.payload.logger.error({ err }, 'Newsletter test failed to send')
      return fail('The test email could not be sent. Please try again in a moment.', 502)
    }
    return Response.json({ ok: true, to, dryRun: sendingMode() === 'dry-run' })
  },
}

/** POST /api/newsletters/:id/send  { scheduleAt? } — sends now (or schedules) to the newsletter's audience. */
const sendEndpoint: Endpoint = {
  path: '/:id/send',
  method: 'post',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return loaded
    const { n, user } = loaded
    if (n.status === 'sending' || n.status === 'sent') return fail('This newsletter has already been sent.', 409)
    const off = sendingOff()
    if (off) return off
    const blockers = sendBlockers(await getBranding(req.payload, tenantOf(n)))
    if (blockers.length) return fail(blockers.join(' '), 400)

    const input = (await req.json?.().catch(() => ({}))) as { scheduleAt?: string }
    if (input.scheduleAt) {
      const at = new Date(input.scheduleAt)
      if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) return fail('Pick a time at least a few minutes from now.', 400)
      if (at.getTime() > Date.now() + 90 * 86_400_000) return fail('Schedule within the next 90 days.', 400)
      await req.payload.update({
        collection: 'newsletters',
        id: n.id,
        data: { status: 'scheduled', scheduledAt: at.toISOString(), sentByName: user.name ?? user.email ?? '' },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      return Response.json({ ok: true, status: 'scheduled', scheduledAt: at.toISOString() })
    }

    const total = await startSending(req.payload, n, user.name ?? user.email ?? '')
    if (total === 0) {
      await req.payload.update({ collection: 'newsletters', id: n.id, data: { status: 'sent' }, overrideAccess: true, context: { disableRevalidate: true } })
      return Response.json({ ok: true, status: 'sent', stats: await newsletterStats(req.payload, Number(n.id)) })
    }
    const stats = await processNewsletter(req.payload, Number(n.id), Date.now() + SEND_BUDGET_MS)
    return Response.json({ ok: true, status: stats.pending ? 'sending' : 'sent', stats })
  },
}

/** POST /api/newsletters/:id/process — continues a large send (the portal calls this until done). */
const processEndpoint: Endpoint = {
  path: '/:id/process',
  method: 'post',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return loaded
    const stats = await processNewsletter(req.payload, Number(loaded.n.id), Date.now() + SEND_BUDGET_MS)
    return Response.json({ ok: true, status: stats.pending ? 'sending' : 'sent', stats })
  },
}

/** POST /api/newsletters/:id/cancel — returns a scheduled newsletter to draft. */
const cancelEndpoint: Endpoint = {
  path: '/:id/cancel',
  method: 'post',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return loaded
    if (loaded.n.status !== 'scheduled') return fail('Only a scheduled newsletter can be cancelled.', 409)
    await req.payload.update({
      collection: 'newsletters',
      id: loaded.n.id,
      data: { status: 'draft', scheduledAt: null },
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    return Response.json({ ok: true, status: 'draft' })
  },
}

/** GET /api/newsletters/:id/preview — the email as supporters will see it. */
const previewEndpoint: Endpoint = {
  path: '/:id/preview',
  method: 'get',
  handler: async (req) => {
    const loaded = await loadForTeam(req)
    if (loaded instanceof Response) return new Response(`<p style="font-family:sans-serif">${esc(((await loaded.json()) as { error: string }).error)}</p>`, { status: loaded.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    const { n } = loaded
    const branding = await getBranding(req.payload, tenantOf(n))
    const { html } = renderEmail(n, branding, newsletterContent(n, branding.brand), '#unsubscribe-link')
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Content-Security-Policy': "script-src 'none'" },
    })
  },
}

// ---- Unsubscribe (public, signed links) ----
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3f5f3;font-family:Arial,Helvetica,sans-serif;color:#1b2620"><main style="max-width:480px;margin:48px auto;padding:28px;background:#fff;border-radius:10px">
<h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
  )

async function unsubscribeSupporter(req: PayloadRequest, supporterId: string) {
  const s = await req.payload.findByID({ collection: 'supporters', id: supporterId, depth: 0, overrideAccess: true }).catch(() => null)
  if (s && s.status !== 'unsubscribed') {
    await req.payload.update({ collection: 'supporters', id: s.id, data: { status: 'unsubscribed' }, overrideAccess: true, context: { disableRevalidate: true } })
  }
  return s
}

const unsubscribeGet: Endpoint = {
  path: '/unsubscribe',
  method: 'get',
  handler: async (req) => {
    const s = String(req.searchParams.get('s') ?? '')
    const t = String(req.searchParams.get('t') ?? '')
    if (!/^\d+$/.test(s) || !verifyUnsubscribe(s, t)) return page('This link is not valid', '<p>The unsubscribe link is incomplete. Please use the link in the email exactly as it is.</p>', 400)
    // Confirmation form, so link scanners that open every link do not unsubscribe people by accident.
    return page(
      'Unsubscribe from updates',
      `<p style="line-height:1.55">Click below and you will stop receiving these updates. You can join again on the website at any time.</p>
<form method="post" action="?s=${esc(s)}&amp;t=${esc(t)}"><button type="submit" style="background:#0b5d3b;color:#fff;border:0;border-radius:999px;padding:12px 22px;font-size:15px;font-weight:bold;cursor:pointer">Unsubscribe</button></form>`,
    )
  },
}

// Handles the confirmation form and one-click unsubscribe from email apps (RFC 8058).
const unsubscribePost: Endpoint = {
  path: '/unsubscribe',
  method: 'post',
  handler: async (req) => {
    const s = String(req.searchParams.get('s') ?? '')
    const t = String(req.searchParams.get('t') ?? '')
    if (!/^\d+$/.test(s) || !verifyUnsubscribe(s, t)) return page('This link is not valid', '<p>The unsubscribe link is incomplete.</p>', 400)
    await unsubscribeSupporter(req, s)
    return page('You have been unsubscribed', '<p style="line-height:1.55">You will not receive these updates again. Thank you for your support.</p>')
  },
}

// ---- Resend webhooks: delivery, opens, clicks, bounces and complaints ----
// Verified with the Svix signature Resend sends (RESEND_WEBHOOK_SECRET, which starts with whsec_).
export function verifySvix(secret: string, headers: Headers, body: string) {
  const id = headers.get('svix-id')
  const ts = headers.get('svix-timestamp')
  const sigs = headers.get('svix-signature')
  if (!id || !ts || !sigs || !secret.startsWith('whsec_')) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false
  const key = Buffer.from(secret.slice(6), 'base64')
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest()
  return sigs.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) return false
    const given = Buffer.from(sig, 'base64')
    return given.length === expected.length && crypto.timingSafeEqual(given, expected)
  })
}

const COLUMN: Record<string, string> = { 'email.delivered': 'delivered_at', 'email.opened': 'opened_at', 'email.clicked': 'clicked_at' }
const STATUS: Record<string, string> = { 'email.bounced': 'bounced', 'email.complained': 'complained' }

const resendWebhook: Endpoint = {
  path: '/resend-webhook',
  method: 'post',
  handler: async (req) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) return fail('Webhook not configured.', 503)
    const body = await req.text?.()
    if (!body || !verifySvix(secret, req.headers, body)) return fail('Invalid signature.', 401)

    const event = JSON.parse(body) as { type?: string; created_at?: string; data?: { email_id?: string } }
    const emailId = event.data?.email_id
    if (!emailId || !event.type) return Response.json({ ok: true, ignored: true })
    const at = event.created_at && !Number.isNaN(Date.parse(event.created_at)) ? new Date(event.created_at).toISOString() : new Date().toISOString()

    if (COLUMN[event.type]) {
      // Only the first delivery / open / click is kept.
      await run(req.payload, sql`UPDATE newsletter_deliveries SET ${sql.raw(COLUMN[event.type])} = COALESCE(${sql.raw(COLUMN[event.type])}, ${at}::timestamptz), updated_at = now() WHERE resend_id = ${emailId}`)
    } else if (STATUS[event.type]) {
      const rows = await run<{ supporter_id: unknown }>(
        req.payload,
        sql`UPDATE newsletter_deliveries SET status = ${STATUS[event.type]}, updated_at = now() WHERE resend_id = ${emailId} RETURNING supporter_id`,
      )
      // Someone who marks the email as spam is never emailed again.
      if (event.type === 'email.complained') for (const r of rows) if (r.supporter_id) await unsubscribeSupporter(req, String(r.supporter_id))
    }
    return Response.json({ ok: true })
  },
}

// ---- Scheduled sends: Vercel Cron calls this (Authorization: Bearer CRON_SECRET) ----
const cronEndpoint: Endpoint = {
  path: '/cron',
  method: 'get',
  handler: async (req) => {
    const secret = process.env.CRON_SECRET
    const given = req.headers.get('authorization') ?? ''
    const expected = `Bearer ${secret}`
    if (!secret || given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return fail('Unauthorised.', 401)
    if (sendingMode() === 'off') return fail('Email sending is not set up.', 503)

    const deadline = Date.now() + 50_000
    const due = await req.payload.find({
      collection: 'newsletters',
      where: { status: { equals: 'scheduled' }, scheduledAt: { less_than_equal: new Date().toISOString() } },
      depth: 0,
      limit: 20,
      overrideAccess: true,
    })
    const started: number[] = []
    for (const n of due.docs) {
      if (sendBlockers(await getBranding(req.payload, tenantOf(n))).length) continue // stays scheduled until the office details are added
      await startSending(req.payload, n, n.sentByName ?? '')
      started.push(Number(n.id))
    }
    const sending = await req.payload.find({ collection: 'newsletters', where: { status: { equals: 'sending' } }, depth: 0, limit: 20, overrideAccess: true })
    const results: Record<string, unknown> = {}
    for (const n of sending.docs) {
      if (Date.now() >= deadline) break
      results[n.id] = await processNewsletter(req.payload, Number(n.id), deadline)
    }
    return Response.json({ ok: true, started, results })
  },
}

export const newsletterEndpoints: Endpoint[] = [
  unsubscribeGet,
  unsubscribePost,
  resendWebhook,
  cronEndpoint,
  statusEndpoint,
  testEndpoint,
  sendEndpoint,
  processEndpoint,
  cancelEndpoint,
  previewEndpoint,
]
