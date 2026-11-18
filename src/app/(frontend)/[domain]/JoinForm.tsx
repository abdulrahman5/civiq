'use client'

import Link from 'next/link'
import { useActionState, useEffect, useRef, useState } from 'react'

import type { ContactState } from './actions'

type SubmitAction = (prev: ContactState, fd: FormData) => Promise<ContactState>

type Props = { action: SubmitAction; consentText: string; interests: string[]; channels: string[]; defaultState?: string | null }

// "Join the movement": adds the visitor to this legislator's supporters, with their consent recorded.
export function JoinForm({ action: submit, consentText, interests, channels, defaultState }: Props) {
  const [state, action, pending] = useActionState<ContactState, FormData>(submit, { ok: false })
  const [startedAt, setStartedAt] = useState('')
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => setStartedAt(String(Date.now())), [])
  useEffect(() => {
    if (state.ok) form.current?.reset()
  }, [state])

  if (state.ok) {
    return (
      <div className="join-done" role="status">
        <h3>Welcome to the movement!</h3>
        <p>Thank you for joining. The office will keep you updated on the channels you chose. You can unsubscribe at any time.</p>
      </div>
    )
  }

  return (
    <form ref={form} action={action} className="join-form">
      <label>Full name<input required name="name" autoComplete="name" maxLength={120} /></label>
      <div className="row">
        <label>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="0803 000 0000" /></label>
        <label>Email <span className="optional">(optional)</span><input name="email" type="email" autoComplete="email" maxLength={200} /></label>
      </div>
      <div className="row three">
        <label>Ward<input name="ward" maxLength={120} /></label>
        <label>LGA<input name="lga" maxLength={120} /></label>
        <label>State<input name="state" maxLength={60} defaultValue={defaultState ?? ''} /></label>
      </div>
      <fieldset>
        <legend>I’m interested in</legend>
        <div className="chips">
          {interests.map((i) => (
            <label key={i} className="chip-check"><input type="checkbox" name="interests" value={i} /><span>{i}</span></label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Contact me by</legend>
        <div className="chips">
          {channels.map((c) => (
            <label key={c} className="chip-check"><input type="checkbox" name="channels" value={c} defaultChecked={c === 'WhatsApp'} /><span>{c}</span></label>
          ))}
        </div>
      </fieldset>
      <label className="consent">
        <input type="checkbox" name="consent" value="yes" required />
        <span>{consentText} <Link href="/privacy">Read the privacy notice</Link>.</span>
      </label>
      {/* Spam traps */}
      <input type="hidden" name="startedAt" value={startedAt} />
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px' }}>
        <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button className="btn btn-gold" type="submit" disabled={pending}>{pending ? 'Joining…' : 'Join the movement'}</button>
      {state.error && <p className="form-msg error" role="alert">{state.error}</p>}
    </form>
  )
}
