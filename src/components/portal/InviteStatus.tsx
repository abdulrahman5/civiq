'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { InviteLink } from './InviteForm'

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })

// Sidebar on a user's screen: invited / last active, and "Resend invite" for people who have not joined.
export function InviteStatus() {
  const { id } = useDocumentInfo()
  const invitedAt = useFormFields(([f]) => f.invitedAt?.value as string | undefined)
  const invitedBy = useFormFields(([f]) => f.invitedByName?.value as string | undefined)
  const lastSeen = useFormFields(([f]) => f.lastSeenAt?.value as string | undefined)
  const name = useFormFields(([f]) => (f.name?.value as string | undefined) ?? '')
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'error'; text?: string; url?: string }>({ kind: 'idle' })

  if (!id) return null

  const resend = async () => {
    setState({ kind: 'busy' })
    const r = await fetch(`/api/users/${id}/resend-invite`, { method: 'POST', credentials: 'include' })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return setState({ kind: 'error', text: json.error || 'Could not resend the invite.' })
    setState({ kind: 'ok', text: json.emailed ? 'A new invite has been emailed. Earlier links no longer work.' : 'New invite link created (email is not set up on this server).', url: json.inviteUrl })
  }

  return (
    <section className="cq-send cq-invite-status" aria-label="Account status">
      <h3>Account</h3>
      {lastSeen ? (
        <p>
          <b className="cq-send__status--sent">Active</b>
          <br />
          <span className="cq-muted cq-send__small">Last active {when(lastSeen)}</span>
        </p>
      ) : invitedAt ? (
        <>
          <p>
            <b>Invited, not joined yet</b>
            <br />
            <span className="cq-muted cq-send__small">
              Invited {when(invitedAt)}
              {invitedBy ? ` by ${invitedBy}` : ''}. Invite links expire after 7 days.
            </span>
          </p>
          <button type="button" className="btn btn--style-secondary btn--size-small" onClick={resend} disabled={state.kind === 'busy'}>
            {state.kind === 'busy' ? 'Sending…' : 'Resend invite'}
          </button>
        </>
      ) : (
        <p className="cq-muted cq-send__small">No portal activity recorded yet.</p>
      )}
      {state.text && (
        <p role={state.kind === 'error' ? 'alert' : 'status'} className={`cq-send__small ${state.kind === 'error' ? 'cq-reply__error' : 'cq-reply__ok'}`}>
          {state.text}
        </p>
      )}
      {state.url && <InviteLink url={state.url} name={name} />}
    </section>
  )
}
