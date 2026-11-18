import type { Endpoint } from 'payload'

import { idOf, isPlatformAdmin, roleIn } from '../access'
import { isPlaceholder } from './placeholder'

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const paragraphs = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
const validEmail = (s?: string | null) => (s && !isPlaceholder(s) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null)

/**
 * POST /api/messages/:id/reply  { subject?, body }
 * Emails a reply to the person who sent the message, from "Office of <legislator>", with the office's
 * email as reply-to, then logs the reply on the message. Only the legislator's admins and editors.
 */
export const replyEndpoint: Endpoint = {
  path: '/:id/reply',
  method: 'post',
  handler: async (req) => {
    const user = req.user as Parameters<typeof isPlatformAdmin>[0] & { name?: string }
    if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 })

    const input = (await req.json?.().catch(() => ({}))) as { subject?: string; body?: string }
    const body = String(input.body ?? '').trim().slice(0, 10000)
    if (!body) return Response.json({ error: 'Write a reply first.' }, { status: 400 })

    // Reading with the user's own permissions: only the legislator's admins and editors get here.
    const id = String(req.routeParams?.id ?? '')
    const msg = await req.payload.findByID({ collection: 'messages', id, depth: 0, overrideAccess: false, req }).catch(() => null)
    if (!msg) return Response.json({ error: 'Message not found.' }, { status: 404 })
    const tenant = Number(idOf(msg.tenant))
    if (!isPlatformAdmin(user) && !['admin', 'editor'].includes(roleIn(user, tenant) ?? '')) {
      return Response.json({ error: 'Only the team’s admins and editors can reply.' }, { status: 403 })
    }
    if (!validEmail(msg.email)) return Response.json({ error: 'This message has no valid email address to reply to.' }, { status: 400 })

    const settings = (
      await req.payload.find({ collection: 'site-settings', where: { tenant: { equals: tenant } }, limit: 1, depth: 0, overrideAccess: true })
    ).docs[0]
    const tenantDoc = await req.payload.findByID({ collection: 'tenants', id: tenant, depth: 0, overrideAccess: true })
    const office = settings?.name || tenantDoc.name
    const replyTo = validEmail(settings?.contact?.email) ?? validEmail(settings?.contact?.notifyEmail) ?? validEmail(settings?.privacyEmail)
    if (!replyTo) {
      return Response.json(
        { error: 'Add the office email in Site settings → Contact & social first, so the person’s answer comes back to your office.' },
        { status: 400 },
      )
    }

    const subject = (String(input.subject ?? '').trim() || `Re: Your message to the office of ${office}`).slice(0, 200)
    const received = new Date(msg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' })
    const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b2620;max-width:620px">
${paragraphs(body)}
<p style="margin:0 0 20px">Office of ${escapeHtml(office)}</p>
<hr style="border:0;border-top:1px solid #dfe5e1;margin:20px 0">
<p style="margin:0 0 6px;color:#5b665f;font-size:13px">Your message of ${escapeHtml(received)}:</p>
<blockquote style="margin:0;padding-left:12px;border-left:3px solid #dfe5e1;color:#5b665f;font-size:13px">${paragraphs(msg.message || '')}</blockquote>
</div>`
    const text = `${body}\n\nOffice of ${office}\n\n---\nYour message of ${received}:\n${msg.message || ''}`

    try {
      await req.payload.sendEmail({
        to: msg.email,
        from: `"Office of ${office.replace(/"/g, '')}" <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}>`,
        replyTo,
        subject,
        html,
        text,
      })
    } catch (err) {
      req.payload.logger.error({ err }, 'Inbox reply failed to send')
      return Response.json({ error: 'The email could not be sent. Please try again in a moment.' }, { status: 502 })
    }

    const sentAt = new Date().toISOString()
    const reply = { sentAt, sentBy: Number(user.id), sentByName: user.name ?? '', to: msg.email, subject, body }
    await req.payload.update({
      collection: 'messages',
      id,
      data: {
        replies: [...(msg.replies ?? []).map((r) => ({ ...r, sentBy: idOf(r.sentBy) as number })), reply],
        status: msg.status === 'unread' ? 'read' : msg.status,
        lastRepliedAt: sentAt,
      },
      overrideAccess: false,
      req,
    })
    // Without a Resend key (local development) Payload only prints the email to the server log.
    return Response.json({ ok: true, delivered: Boolean(process.env.RESEND_API_KEY), reply })
  },
}
