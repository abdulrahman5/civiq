'use client'

import { useAuth, useDocumentInfo, useField } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type Msg = { id?: string; at: string; authorName?: string | null; fromCiviq?: boolean | null; body: string }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })
const STATUS_WORDS: Record<string, string> = { new: 'New', 'in-progress': 'In progress', waiting: 'Waiting on office', resolved: 'Resolved' }

// The conversation on a support request, for both the office (Portal) and the Civiq team (Admin).
export function SupportThread() {
  const { id } = useDocumentInfo()
  const { user } = useAuth()
  const civiq = (user as { platformRole?: string } | null)?.platformRole === 'platform-admin'
  const { value: statusValue, setValue: setStatusField } = useField<string>({ path: 'status' })
  const [messages, setMessages] = useState<Msg[] | null>(null)
  const [body, setBody] = useState('')
  const [nextStatus, setNextStatus] = useState('waiting')
  const [state, setState] = useState<{ busy?: boolean; ok?: string; error?: string }>({})
  const [status, setStatus] = useState<string | undefined>(undefined)

  const current = status ?? statusValue
  const list = messages

  // Load the conversation (the messages array is a hidden field).
  useEffect(() => {
    if (!id) return
    fetch(`/api/support-requests/${id}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => setMessages([]))
  }, [id])

  if (!id) return null

  const send = async (resolve = false) => {
    setState({ busy: true })
    const r = await fetch(`/api/support-requests/${id}/reply`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(civiq ? { body, status: nextStatus } : { body, resolve }),
    })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return setState({ error: json.error || 'Could not send.' })
    setMessages(json.messages ?? [])
    setStatus(json.status)
    setStatusField(json.status, true)
    setBody('')
    setState({ ok: resolve ? 'Marked as resolved. Thank you!' : civiq ? 'Reply sent; the office has been emailed.' : 'Sent. The Civiq team has been notified.' })
  }

  return (
    <section className="cq-reply cq-support" aria-label="Conversation with the Civiq team">
      <h3>
        Conversation <span className={`cq-support__status cq-support__status--${current}`}>{STATUS_WORDS[current ?? 'new'] ?? current}</span>
      </h3>
      {list && list.length > 0 ? (
        <ol className="cq-reply__history">
          {list.map((m, i) => (
            <li key={m.id ?? i} className={m.fromCiviq ? 'cq-support__civiq' : ''}>
              <p className="cq-reply__meta">
                <b>{m.authorName || (m.fromCiviq ? 'Civiq' : 'The office')}</b> · {when(m.at)}
              </p>
              <p className="cq-reply__body">{m.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cq-muted">{civiq ? 'No replies yet. The office is waiting to hear from you.' : 'No replies yet. The Civiq team has been notified and will reply here.'}</p>
      )}
      <div className="cq-reply__form">
        <label>
          {civiq ? 'Reply to the office' : 'Add a reply'}
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} placeholder={civiq ? 'Hello, thanks for letting us know…' : 'Anything to add?'} />
        </label>
        <div className="cq-reply__actions">
          {civiq && (
            <label className="cq-support__next">
              then set status to{' '}
              <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                <option value="waiting">Waiting on office</option>
                <option value="in-progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          )}
          <button type="button" className="btn btn--style-primary btn--size-medium" onClick={() => send(false)} disabled={!body.trim() || state.busy}>
            {state.busy ? 'Sending…' : 'Send reply'}
          </button>
          {!civiq && current !== 'resolved' && (
            <button type="button" className="btn btn--style-secondary btn--size-medium" onClick={() => send(true)} disabled={state.busy}>
              Mark as resolved
            </button>
          )}
          {state.ok && <span role="status" className="cq-reply__ok">{state.ok}</span>}
          {state.error && <span role="alert" className="cq-reply__error">{state.error}</span>}
        </div>
        {!civiq && current === 'resolved' && <p className="cq-muted">This request is resolved. Replying will reopen it.</p>}
      </div>
    </section>
  )
}
