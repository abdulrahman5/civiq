'use client'

import { useDocumentInfo, useField } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Reply = { id?: string; sentAt: string; sentByName?: string | null; to?: string | null; subject?: string | null; body?: string | null }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })

// Reply by email from the message screen, with the history of replies already sent.
export function ReplyBox() {
  const { id } = useDocumentInfo()
  const { value: email } = useField<string>({ path: 'email' })
  const { setValue: setStatus } = useField<string>({ path: 'status' })
  const { setValue: setLastReplied } = useField<string>({ path: 'lastRepliedAt' })
  const [replies, setReplies] = useState<Reply[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [state, setState] = useState<{ kind: 'idle' | 'sending' | 'sent' | 'warning' | 'error'; text?: string }>({ kind: 'idle' })

  const load = useCallback(async () => {
    if (!id) return
    const r = await fetch(`/api/messages/${id}?depth=0`, { credentials: 'include' })
    if (r.ok) setReplies(((await r.json()).replies ?? []) as Reply[])
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  if (!id) return null

  const send = async () => {
    setState({ kind: 'sending' })
    const r = await fetch(`/api/messages/${id}/reply`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body }),
    })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return setState({ kind: 'error', text: json.error || 'The reply could not be sent.' })
    setBody('')
    setSubject('')
    setStatus('read', true)
    setLastReplied(json.reply?.sentAt, true)
    setState(
      json.delivered
        ? { kind: 'sent', text: `Reply sent to ${email}.` }
        : { kind: 'warning', text: 'Reply saved, but email is not set up on this server, so it was not delivered.' },
    )
    load()
  }

  return (
    <section className="cq-reply" aria-label="Reply by email">
      <h3>Reply by email</h3>
      {replies.length > 0 && (
        <ol className="cq-reply__history">
          {replies.map((r, i) => (
            <li key={r.id ?? i}>
              <p className="cq-reply__meta">
                <b>{r.sentByName || 'The office'}</b> replied · {when(r.sentAt)}
                {r.subject ? <> · “{r.subject}”</> : null}
              </p>
              <p className="cq-reply__body">{r.body}</p>
            </li>
          ))}
        </ol>
      )}
      {email ? (
        <div className="cq-reply__form">
          <p className="cq-muted">
            To <b>{email}</b>. Sent from the office’s name; their answer comes back to the office email in Site settings.
          </p>
          <label>
            <span>
              Subject <span className="cq-muted">(optional)</span>
            </span>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Re: Your message to the office" />
          </label>
          <label>
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={10000} placeholder="Dear …" />
          </label>
          <div className="cq-reply__actions">
            <button type="button" className="btn btn--style-primary btn--size-medium" onClick={send} disabled={!body.trim() || state.kind === 'sending'}>
              {state.kind === 'sending' ? 'Sending…' : 'Send reply'}
            </button>
            {state.text && (
              <span role={state.kind === 'error' ? 'alert' : 'status'} className={`cq-reply__${state.kind === 'sent' ? 'ok' : state.kind}`}>
                {state.text}
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="cq-muted">This message has no email address to reply to.</p>
      )}
    </section>
  )
}
