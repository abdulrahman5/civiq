'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type Stats = { total: number; pending: number; sent: number; failed: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number }
type Info = {
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduledAt: string | null
  sentAt: string | null
  sentByName: string | null
  audienceCount: number
  stats: Stats
  blockers: string[]
  mode: 'live' | 'dry-run' | 'off'
  scheduleNote: string | null
}
type Note = { kind: 'ok' | 'error' | 'warning'; text: string } | null

const fmt = (n: number) => n.toLocaleString('en-NG')
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–')
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })
const people = (n: number) => `${fmt(n)} ${n === 1 ? 'person' : 'people'}`

// Sidebar on the newsletter screen: preview, test, send or schedule, then progress and results.
export function SendPanel() {
  const { id } = useDocumentInfo()
  const modified = useFormModified()
  const router = useRouter()
  const [info, setInfo] = useState<Info | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<Note>(null)
  const [scheduleAt, setScheduleAt] = useState('')
  const polling = useRef(false)

  const load = useCallback(async () => {
    if (!id) return null
    const r = await fetch(`/api/newsletters/${id}/status`, { credentials: 'include', cache: 'no-store' })
    if (!r.ok) return null
    const json = (await r.json()) as Info
    setInfo(json)
    return json
  }, [id])

  const post = async (action: string, body?: object) => {
    const r = await fetch(`/api/newsletters/${id}/${action}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    return { ok: r.ok, json: (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string; stats?: Stats; status?: string } }
  }

  // Large lists are sent in rounds; keep the rounds going while this screen is open.
  const keepSending = useCallback(async () => {
    if (polling.current) return
    polling.current = true
    try {
      for (let i = 0; i < 200; i++) {
        const { ok, json } = await post('process')
        await load()
        if (!ok || json.status !== 'sending') break
      }
    } finally {
      polling.current = false
      router.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, load, router])

  useEffect(() => {
    load().then((i) => {
      if (i?.status === 'sending') keepSending()
    })
  }, [load, keepSending])

  if (!id) return <p className="cq-send cq-muted">Save the draft first. Then you can preview it, send yourself a test and send it out.</p>
  if (!info) return <div className="cq-send cq-muted">Loading…</div>

  const s = info.stats

  const sendTest = async () => {
    setBusy('test')
    setNote(null)
    const { ok, json } = await post('test')
    setBusy(null)
    setNote(ok ? { kind: json.dryRun ? 'warning' : 'ok', text: json.dryRun ? `Test recorded (dry run, nothing emailed) for ${json.to}.` : `Test sent to ${json.to}.` } : { kind: 'error', text: json.error || 'The test could not be sent.' })
  }

  const sendNow = async () => {
    if (!window.confirm(`Send this newsletter to ${people(info.audienceCount)} now? This cannot be undone.`)) return
    setBusy('send')
    setNote(null)
    const { ok, json } = await post('send')
    setBusy(null)
    if (!ok) return setNote({ kind: 'error', text: json.error || 'The newsletter could not be sent.' })
    await load()
    if (json.status === 'sending') keepSending()
    else router.refresh()
  }

  const schedule = async () => {
    if (!scheduleAt) return
    setBusy('schedule')
    setNote(null)
    const { ok, json } = await post('send', { scheduleAt: new Date(scheduleAt).toISOString() })
    setBusy(null)
    if (!ok) return setNote({ kind: 'error', text: json.error || 'The newsletter could not be scheduled.' })
    await load()
    router.refresh()
  }

  const cancel = async () => {
    setBusy('cancel')
    const { ok, json } = await post('cancel')
    setBusy(null)
    if (!ok) return setNote({ kind: 'error', text: json.error || 'Could not cancel.' })
    await load()
    router.refresh()
  }

  return (
    <section className="cq-send" aria-label="Send newsletter">
      <h3>Send</h3>

      {info.status === 'sent' && (
        <>
          <p className="cq-send__status cq-send__status--sent">
            Sent{info.sentAt ? ` ${when(info.sentAt)}` : ''}
            {info.sentByName ? ` by ${info.sentByName}` : ''}
          </p>
          <dl className="cq-send__stats">
            <div><dt>Sent to</dt><dd>{fmt(s.sent)}</dd></div>
            <div><dt>Delivered</dt><dd>{fmt(s.delivered)} <span>{pct(s.delivered, s.sent)}</span></dd></div>
            <div><dt>Opened</dt><dd>{fmt(s.opened)} <span>{pct(s.opened, s.delivered || s.sent)}</span></dd></div>
            <div><dt>Clicked</dt><dd>{fmt(s.clicked)} <span>{pct(s.clicked, s.delivered || s.sent)}</span></dd></div>
            {s.bounced + s.failed > 0 && <div><dt>Not delivered</dt><dd>{fmt(s.bounced + s.failed)}</dd></div>}
            {s.complained > 0 && <div><dt>Marked as spam</dt><dd>{fmt(s.complained)}</dd></div>}
          </dl>
          <p className="cq-muted cq-send__small">Opens are estimates: some email apps hide them. Sent newsletters can’t be edited.</p>
        </>
      )}

      {info.status === 'sending' && (
        <>
          <p className="cq-send__status">Sending… {fmt(s.total - s.pending)} of {fmt(s.total)}</p>
          <progress max={s.total || 1} value={s.total - s.pending} aria-label="Sending progress" />
          <p className="cq-muted cq-send__small">Keep this page open to finish faster. If you close it, sending continues on the next scheduled run.</p>
        </>
      )}

      {info.status === 'scheduled' && info.scheduledAt && (
        <>
          <p className="cq-send__status">Scheduled for {when(info.scheduledAt)}</p>
          <p className="cq-muted cq-send__small">Goes to {people(info.audienceCount)} (as of now). Cancel to make changes.</p>
          {info.scheduleNote && <p className="cq-muted cq-send__small">{info.scheduleNote}</p>}
          <button type="button" className="btn btn--style-secondary btn--size-small" onClick={cancel} disabled={busy !== null}>
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel schedule'}
          </button>
        </>
      )}

      {info.status === 'draft' && (
        <>
          <p className="cq-send__count">
            <b>{people(info.audienceCount)}</b> will receive this
          </p>
          <p className="cq-muted cq-send__small">Subscribed supporters with an email address{info.audienceCount === 0 ? '. Change the audience or wait for more sign-ups.' : '.'}</p>
          {modified && <p className="cq-reply__warning cq-send__small">You have unsaved changes. Save before previewing or sending.</p>}
          {info.blockers.map((b) => (
            <p key={b} className="cq-reply__warning cq-send__small">{b}</p>
          ))}
          {info.mode === 'off' && <p className="cq-reply__warning cq-send__small">Email sending is not set up on this server yet.</p>}
          {info.mode === 'dry-run' && <p className="cq-reply__warning cq-send__small">Dry-run mode: sends are recorded but no email leaves the server.</p>}

          <div className="cq-send__actions">
            <a className="btn btn--style-secondary btn--size-small" href={`/api/newsletters/${id}/preview`} target="_blank" rel="noreferrer">
              Preview
            </a>
            <button type="button" className="btn btn--style-secondary btn--size-small" onClick={sendTest} disabled={modified || busy !== null || info.mode === 'off'}>
              {busy === 'test' ? 'Sending…' : 'Send test to me'}
            </button>
          </div>
          <button
            type="button"
            className="btn btn--style-primary btn--size-medium cq-send__go"
            onClick={sendNow}
            disabled={modified || busy !== null || info.audienceCount === 0 || info.blockers.length > 0 || info.mode === 'off'}
          >
            {busy === 'send' ? 'Sending…' : `Send to ${people(info.audienceCount)}`}
          </button>
          <details className="cq-send__schedule">
            <summary>Schedule for later</summary>
            {info.scheduleNote && <p className="cq-muted cq-send__small">{info.scheduleNote}</p>}
            <label>
              <span className="cq-muted cq-send__small">Date and time (your device’s time zone)</span>
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </label>
            <button
              type="button"
              className="btn btn--style-secondary btn--size-small"
              onClick={schedule}
              disabled={!scheduleAt || modified || busy !== null || info.audienceCount === 0 || info.blockers.length > 0 || info.mode === 'off'}
            >
              {busy === 'schedule' ? 'Scheduling…' : 'Schedule'}
            </button>
          </details>
        </>
      )}

      {note && (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`cq-send__small cq-reply__${note.kind}`}>
          {note.text}
        </p>
      )}
    </section>
  )
}
