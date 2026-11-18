'use server'

import { MESSAGE_TOPICS } from '@/collections/Messages'
import { CONTACT_CHANNELS, SUPPORTER_INTERESTS } from '@/collections/Supporters'
import { asSite, getClient, getSettings } from '@/lib/payload'
import { getTenantByHost } from '@/lib/tenant'
import { joinConsentText, messageConsentText } from './consent'

export type ContactState = { ok: boolean; error?: string }

const field = (fd: FormData, name: string, max: number) => String(fd.get(name) ?? '').trim().slice(0, max)
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// Spam traps: a hidden field real visitors never fill in, and a minimum time on the page.
const looksLikeSpam = (fd: FormData) => {
  const startedAt = Number(fd.get('startedAt'))
  return Boolean(field(fd, 'website', 200)) || !startedAt || Date.now() - startedAt < 3000
}

/** Nigerian numbers in one format (+234…), so the same person is recognised when they join again. */
const normalisePhone = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('234')) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return `+234${digits.slice(1)}`
  return digits
}

// `domain` is bound on the server when the page renders; the tenant is looked up again here, never trusted from the form.
export async function submitMessage(domain: string, _prev: ContactState, fd: FormData): Promise<ContactState> {
  if (looksLikeSpam(fd)) return { ok: true }

  const name = field(fd, 'name', 120)
  const email = field(fd, 'email', 200)
  const message = field(fd, 'message', 5000)
  const topic = field(fd, 'topic', 50)
  if (!name || !isEmail(email)) return { ok: false, error: 'Please enter your name and a valid email address.' }
  if (fd.get('consent') !== 'yes') return { ok: false, error: 'Please tick the box to agree to the privacy notice.' }

  const tenant = await getTenantByHost(domain)
  if (!tenant) return { ok: false, error: 'Sorry, this site is not accepting messages right now.' }
  const settings = await getSettings(tenant.id)
  const office = settings?.name || tenant.name

  const data = {
    tenant: tenant.id,
    name,
    email,
    phone: field(fd, 'phone', 40),
    ward: field(fd, 'ward', 120),
    topic: (MESSAGE_TOPICS.includes(topic) ? topic : 'Share feedback') as 'Share feedback',
    message,
    status: 'new' as const,
    consentAt: new Date().toISOString(),
    consentText: messageConsentText(office),
  }

  try {
    const payload = await getClient()
    // The public cannot create messages through the API; this trusted server action can,
    // and only for this legislator (the database refuses any other tenant).
    await asSite(tenant.id, (req) => payload.create({ collection: 'messages', data, overrideAccess: true, req }))

    const to = settings?.contact?.notifyEmail
    if (to) {
      const rows = Object.entries({ Name: name, Email: email, Phone: data.phone, Ward: data.ward, Topic: data.topic })
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${escapeHtml(v)}</td></tr>`)
        .join('')
      await payload
        .sendEmail({
          to,
          replyTo: email,
          subject: `New message on ${tenant.name}’s website: ${data.topic} from ${name}`,
          html: `<table>${rows}</table><p style="white-space:pre-wrap">${escapeHtml(message)}</p><p>View and manage it in the Inbox of the Civiq console.</p>`,
        })
        .catch((err: unknown) => payload.logger.error({ err }, 'Contact form email failed'))
    }
    return { ok: true }
  } catch (err) {
    ;(await getClient()).logger.error({ err }, 'Contact form submission failed')
    return { ok: false, error: 'Sorry, something went wrong. Please email or call the office.' }
  }
}

export async function joinMovement(domain: string, _prev: ContactState, fd: FormData): Promise<ContactState> {
  if (looksLikeSpam(fd)) return { ok: true }

  const name = field(fd, 'name', 120)
  const phone = normalisePhone(field(fd, 'phone', 40))
  const email = field(fd, 'email', 200).toLowerCase()
  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!phone && !email) return { ok: false, error: 'Please enter a phone number or an email address so the office can reach you.' }
  if (email && !isEmail(email)) return { ok: false, error: 'Please check your email address.' }
  if (phone && !/^\+?\d{7,15}$/.test(phone)) return { ok: false, error: 'Please check your phone number.' }
  if (fd.get('consent') !== 'yes') return { ok: false, error: 'Please tick the box to agree, so the office can contact you.' }

  const tenant = await getTenantByHost(domain)
  if (!tenant) return { ok: false, error: 'Sorry, this site is not accepting sign-ups right now.' }
  const settings = await getSettings(tenant.id)

  const pick = (key: string, allowed: string[]) => fd.getAll(key).map(String).filter((v) => allowed.includes(v))
  const data = {
    tenant: tenant.id,
    name,
    phone: phone || null,
    email: email || null,
    ward: field(fd, 'ward', 120),
    lga: field(fd, 'lga', 120),
    state: field(fd, 'state', 60),
    interests: pick('interests', SUPPORTER_INTERESTS),
    channels: pick('channels', CONTACT_CHANNELS),
    status: 'subscribed' as const,
    consentAt: new Date().toISOString(),
    consentText: joinConsentText(settings?.name || tenant.name),
    consentSource: `Join form on ${domain}`,
  } as Record<string, unknown>

  try {
    const payload = await getClient()
    await asSite(tenant.id, async (req) => {
      // Someone joining again with the same phone or email updates their record (and renews consent).
      const same = [phone && { phone: { equals: phone } }, email && { email: { equals: email } }].filter(Boolean)
      const existing = await payload
        .find({ collection: 'supporters', where: { and: [{ tenant: { equals: tenant.id } }, { or: same as never[] }] }, limit: 1, depth: 0, overrideAccess: true, req })
        .then((r) => r.docs[0])
      if (existing) {
        // Written at the database level: the public site's restricted role has no access to the
        // console's document-lock tables, which a regular update would touch.
        // Interests and channels are added to, and blank fields keep what was there before.
        const union = (a: unknown, b: unknown) => [...new Set([...((a as string[]) ?? []), ...((b as string[]) ?? [])])]
        const keep = (k: string) => (data[k] ? data[k] : (existing as unknown as Record<string, unknown>)[k])
        const merged = {
          ...data,
          phone: keep('phone'),
          email: keep('email'),
          ward: keep('ward'),
          lga: keep('lga'),
          state: keep('state'),
          interests: union(existing.interests, data.interests),
          channels: union(existing.channels, data.channels),
          unsubscribedAt: null,
        }
        await payload.db.updateOne({ collection: 'supporters', id: existing.id, data: merged, req })
      } else {
        await payload.create({ collection: 'supporters', data: data as never, overrideAccess: true, req })
      }
    })
    return { ok: true }
  } catch (err) {
    ;(await getClient()).logger.error({ err }, 'Join form submission failed')
    return { ok: false, error: 'Sorry, something went wrong. Please try again in a moment.' }
  }
}
