import { convertLexicalToHTML, LinkHTMLConverter } from '@payloadcms/richtext-lexical/html'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import crypto from 'node:crypto'
import type { Payload } from 'payload'

import type { Newsletter } from '@/payload-types'
import { idOf } from '../../access'
import { isPlaceholder } from '../placeholder'
import { getPortalUrl } from '../site-url'
import { themeOf } from '../themes'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
export const validEmail = (s?: string | null) => (s && !isPlaceholder(s) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null)

// ---- Unsubscribe links: signed per supporter, so nobody can unsubscribe someone else by guessing ----
export const unsubscribeToken = (supporterId: number | string) =>
  crypto.createHmac('sha256', process.env.PAYLOAD_SECRET || '').update(`unsubscribe:${supporterId}`).digest('base64url').slice(0, 32)

export const unsubscribeUrl = (supporterId: number | string) =>
  `${getPortalUrl()}/api/newsletters/unsubscribe?s=${supporterId}&t=${unsubscribeToken(supporterId)}`

export const verifyUnsubscribe = (supporterId: string, token: string) => {
  const expected = unsubscribeToken(supporterId)
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

// ---- The legislator's details used in every email ----
export type Branding = {
  office: string // e.g. "Hon. Saidu Musa Abdullahi"
  brand: string
  accent: string
  address: string | null
  replyTo: string | null
  siteUrl: string | null
}

export async function getBranding(payload: Payload, tenant: number): Promise<Branding> {
  const [settings, tenantDoc] = await Promise.all([
    payload.find({ collection: 'site-settings', where: { tenant: { equals: tenant } }, limit: 1, depth: 0, overrideAccess: true }).then((r) => r.docs[0]),
    payload.findByID({ collection: 'tenants', id: tenant, depth: 0, overrideAccess: true }),
  ])
  const address = settings?.contact?.address && !isPlaceholder(settings.contact.address) ? settings.contact.address : null
  return {
    office: settings?.name || tenantDoc.name,
    brand: themeOf(tenantDoc).brand,
    accent: themeOf(tenantDoc).accent,
    address,
    replyTo: validEmail(settings?.contact?.email) ?? validEmail(settings?.contact?.notifyEmail) ?? validEmail(settings?.privacyEmail),
    siteUrl: tenantDoc.primaryDomain ? `https://${tenantDoc.primaryDomain}` : null,
  }
}

/** What stops a newsletter from being sent, in plain words (empty = ready). */
export const sendBlockers = (b: Branding) =>
  [
    !b.replyTo && 'Add the office email in Site settings → Contact & social, so replies come back to the office.',
    !b.address && 'Add the office address in Site settings → Contact & social. Bulk email must include a postal address.',
  ].filter(Boolean) as string[]

// ---- Content ----
const absolute = (html: string) => html.replace(/(src|href)="\/(?!\/)/g, `$1="${getPortalUrl()}/`)

// Email apps ignore most stylesheets, so styles go inline on each element.
const inlineStyles = (html: string, brand: string) =>
  html
    .replace(/<p(\s|>)/g, '<p style="margin:0 0 16px;line-height:1.6"$1')
    .replace(/<h1(\s|>)/g, '<h1 style="margin:24px 0 12px;font-size:24px;line-height:1.3"$1')
    .replace(/<h2(\s|>)/g, '<h2 style="margin:24px 0 12px;font-size:20px;line-height:1.3"$1')
    .replace(/<h3(\s|>)/g, '<h3 style="margin:20px 0 10px;font-size:17px;line-height:1.3"$1')
    .replace(/<(ul|ol)(\s|>)/g, '<$1 style="margin:0 0 16px;padding-left:22px"$2')
    .replace(/<li(\s|>)/g, '<li style="margin:0 0 6px;line-height:1.55"$1')
    .replace(/<blockquote(\s|>)/g, '<blockquote style="margin:0 0 16px;padding-left:14px;border-left:3px solid #dfe5e1;color:#4a5650"$1')
    .replace(/<a(\s)/g, `<a style="color:${brand};text-decoration:underline"$1`)
    .replace(/<img(\s)/g, '<img style="max-width:100%;height:auto;border-radius:6px"$1')

export function newsletterContent(n: Newsletter, brand: string) {
  const data = n.body as Parameters<typeof convertLexicalToHTML>[0]['data']
  const html = convertLexicalToHTML({
    data,
    disableContainer: true,
    converters: ({ defaultConverters }) => ({ ...defaultConverters, ...LinkHTMLConverter({ internalDocToHref: () => getPortalUrl() }) }),
  })
  const media = n.image && typeof n.image === 'object' ? n.image : null
  const imageUrl = media ? (media.sizes?.large?.url || media.url || null) : null
  return {
    bodyHtml: inlineStyles(absolute(html), brand),
    bodyText: convertLexicalToPlaintext({ data }).trim(),
    imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : getPortalUrl() + imageUrl) : null,
    imageAlt: media?.alt ?? '',
  }
}

/** The finished email for one recipient. `unsubscribe` is that person's signed link. */
export function renderEmail(n: Newsletter, b: Branding, content: ReturnType<typeof newsletterContent>, unsubscribe: string) {
  const button =
    n.buttonLabel && n.buttonUrl
      ? `<tr><td style="padding:8px 32px 28px"><a href="${esc(n.buttonUrl)}" style="display:inline-block;background:${b.brand};color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(n.buttonLabel)}</a></td></tr>`
      : ''
  const image = content.imageUrl
    ? `<tr><td style="padding:0"><img src="${esc(content.imageUrl)}" alt="${esc(content.imageAlt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto"></td></tr>`
    : ''
  const site = b.siteUrl ? `<a href="${esc(b.siteUrl)}" style="color:#5b665f">${esc(b.siteUrl.replace(/^https:\/\//, ''))}</a>` : 'the website'
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(n.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f3">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(n.previewText || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1b2620;font-size:16px">
<tr><td style="background:${b.brand};padding:20px 32px;color:#ffffff"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${b.accent};font-weight:bold">Update from the office of</div><div style="font-size:20px;font-weight:bold;margin-top:4px">${esc(b.office)}</div></td></tr>
${image}
<tr><td style="padding:28px 32px 8px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${esc(n.subject)}</h1>${content.bodyHtml}</td></tr>
${button}
<tr><td style="padding:20px 32px 28px;border-top:1px solid #e6ebe7;font-size:13px;line-height:1.55;color:#5b665f">
You are receiving this because you joined the movement on ${site}.<br>
Office of ${esc(b.office)}${b.address ? ` · ${esc(b.address)}` : ''}<br>
<a href="${esc(unsubscribe)}" style="color:#5b665f">Unsubscribe</a> · Replying to this email reaches the office.
</td></tr>
</table></td></tr></table></body></html>`
  const text = `${n.subject}\n\n${content.bodyText}\n${n.buttonLabel && n.buttonUrl ? `\n${n.buttonLabel}: ${n.buttonUrl}\n` : ''}\n---\nYou are receiving this because you joined the movement on ${b.siteUrl ?? 'the website'}.\nOffice of ${b.office}${b.address ? `, ${b.address}` : ''}\nUnsubscribe: ${unsubscribe}`
  return { html, text }
}

export const fromAddress = (b: Branding) => `"Office of ${b.office.replace(/"/g, '')}" <${process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'}>`

export const tenantOf = (n: Newsletter) => Number(idOf(n.tenant))
