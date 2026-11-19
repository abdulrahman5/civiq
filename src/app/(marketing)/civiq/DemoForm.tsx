'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'

import type { LeadState } from './actions'

type Props = {
  action: (prev: LeadState, fd: FormData) => Promise<LeadState>
  consentText: string
  roles: readonly string[]
  chambers: { value: string; label: string }[]
  whatsapp?: string | null
}

export function DemoForm({ action: submit, consentText, roles, chambers, whatsapp }: Props) {
  const [state, action, pending] = useActionState<LeadState, FormData>(submit, { ok: false })
  const [startedAt, setStartedAt] = useState('')
  useEffect(() => setStartedAt(String(Date.now())), [])

  if (state.ok) {
    return (
      <div className="mk-done" role="status">
        <h3>Thank you. We’ll be in touch shortly.</h3>
        <p>A member of the Civiq team will contact you, usually within one working day, to arrange your demo.</p>
        {whatsapp && (
          <a className="mk-btn mk-btn--ghost" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">
            Chat with us on WhatsApp
          </a>
        )}
      </div>
    )
  }

  return (
    <form action={action} className="mk-form">
      <div className="mk-form__row">
        <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
        <label>
          Your role
          <select name="role" defaultValue="">
            <option value="" disabled>Choose…</option>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>
      <div className="mk-form__row">
        <label>Phone / WhatsApp<input name="phone" type="tel" maxLength={40} autoComplete="tel" placeholder="0803 000 0000" /></label>
        <label>Email<input name="email" type="email" maxLength={200} autoComplete="email" /></label>
      </div>
      <div className="mk-form__row">
        <label>Legislator’s name<input name="legislatorName" maxLength={160} placeholder="e.g. Hon. Ada Okafor" /></label>
        <label>
          Chamber
          <select name="chamber" defaultValue="">
            <option value="" disabled>Choose…</option>
            {chambers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            <option value="unsure">Not sure yet</option>
          </select>
        </label>
      </div>
      <label>Constituency / state<input name="constituency" maxLength={160} placeholder="e.g. Idemili North & South, Anambra" /></label>
      <label>Anything we should know? <span className="mk-optional">(optional)</span><textarea name="message" rows={3} maxLength={3000} /></label>
      <label className="mk-consent-check">
        <input type="checkbox" name="consent" value="yes" required />
        <span>{consentText} <Link href="/privacy">Privacy notice</Link></span>
      </label>
      {/* Spam traps */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="mk-hp" aria-hidden="true" />
      <input type="hidden" name="startedAt" value={startedAt} />
      {state.error && <p className="mk-error" role="alert">{state.error}</p>}
      <button type="submit" className="mk-btn mk-btn--gold" disabled={pending}>{pending ? 'Sending…' : 'Request a demo'}</button>
      <p className="mk-fine">A phone/WhatsApp number or an email is enough. We never share your details.</p>
    </form>
  )
}
