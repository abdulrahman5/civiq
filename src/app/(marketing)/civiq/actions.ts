'use server'

import { headers } from 'next/headers'

import { CHAMBER_OPTIONS } from '@/lib/themes'
import { LEAD_ROLES } from '@/collections/Leads'
import { getCiviqSettings, leadConsentText } from '@/lib/marketing'
import { getClient } from '@/lib/payload'

export type LeadState = { ok: boolean; error?: string }

const field = (fd: FormData, name: string, max: number) => String(fd.get(name) ?? '').trim().slice(0, max)
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

// "Request a demo" on theciviq.com.ng: saves a lead for the Civiq team and emails an alert.
export async function submitLead(_prev: LeadState, fd: FormData): Promise<LeadState> {
  // Spam traps: a hidden field people never fill in, and a minimum time on the page.
  const startedAt = Number(fd.get('startedAt'))
  if (field(fd, 'website', 200) || !startedAt || Date.now() - startedAt < 3000) return { ok: true }

  const name = field(fd, 'name', 120)
  const phone = field(fd, 'phone', 40)
  const email = field(fd, 'email', 200)
  const role = field(fd, 'role', 40)
  const chamber = field(fd, 'chamber', 20)
  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!phone && !email) return { ok: false, error: 'Please give a phone/WhatsApp number or an email address so we can reach you.' }
  if (email && !isEmail(email)) return { ok: false, error: 'Please check the email address.' }
  if (fd.get('consent') !== 'yes') return { ok: false, error: 'Please tick the box so we can contact you.' }

  const data = {
    name,
    phone,
    email: email || undefined,
    role: ((LEAD_ROLES as readonly string[]).includes(role) ? role : 'Other') as (typeof LEAD_ROLES)[number],
    legislatorName: field(fd, 'legislatorName', 160),
    chamber: ([...CHAMBER_OPTIONS.map((c) => c.value), 'unsure'] as string[]).includes(chamber) ? (chamber as 'senate') : 'unsure',
    constituency: field(fd, 'constituency', 160),
    message: field(fd, 'message', 3000),
    status: 'new' as const,
    consentAt: new Date().toISOString(),
    consentText: leadConsentText,
    source: (await headers()).get('referer')?.slice(0, 300) ?? '',
  }

  try {
    const payload = await getClient()
    // Leads cannot be created through the API; this trusted server action creates them.
    await payload.create({ collection: 'leads', data: data as never, overrideAccess: true })
    const to = (await getCiviqSettings())?.leadNotifyEmail
    if (to) {
      const rows = Object.entries({ Name: name, Role: data.role, Phone: phone, Email: email, Legislator: data.legislatorName, Chamber: data.chamber, Constituency: data.constituency })
        .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td>${escapeHtml(v || '')}</td></tr>`)
        .join('')
      await payload
        .sendEmail({
          to,
          ...(email ? { replyTo: email } : {}),
          subject: `New demo request: ${data.legislatorName || name}`,
          html: `<table>${rows}</table><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p><p>Open it in the Civiq Portal under Civiq platform → Leads.</p>`,
        })
        .catch((err: unknown) => payload.logger.error({ err }, 'Lead alert email failed'))
    }
    return { ok: true }
  } catch (err) {
    ;(await getClient()).logger.error({ err }, 'Saving a lead failed')
    return { ok: false, error: 'Sorry, something went wrong. Please try again, or reach us on WhatsApp.' }
  }
}
