'use client'

import { useDocumentInfo, useFormModified } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Record_ = { type: string; name: string; value: string; why: string }
type Domain = { domain: string; status: 'not-connected' | 'needs-verification' | 'dns-pending' | 'live' | 'error'; redirectTo: string | null; records: Record_[]; message?: string }
type Data = { configured: boolean; previewUrl: string | null; domains: Domain[]; checklist: { done: boolean; label: string }[]; errors?: string[] }

const STATUS: Record<Domain['status'], { label: string; tone: 'ok' | 'wait' | 'bad' }> = {
  live: { label: 'Live', tone: 'ok' },
  'dns-pending': { label: 'Waiting for DNS', tone: 'wait' },
  'needs-verification': { label: 'Needs ownership check', tone: 'wait' },
  'not-connected': { label: 'Not connected', tone: 'bad' },
  error: { label: 'Could not check', tone: 'bad' },
}

function CopyCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <td>
      <code>{value}</code>{' '}
      <button
        type="button"
        className="cq-domains__copy"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {})
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </td>
  )
}

// On a legislator site's screen (platform admins): connect its domains to Vercel, show the DNS records
// to give the registrar, live status, and the onboarding checklist.
export function DomainPanel() {
  const { id } = useDocumentInfo()
  const modified = useFormModified()
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setBusy(true)
    const r = await fetch(`/api/tenants/${id}/domains`, { credentials: 'include', cache: 'no-store' })
    setBusy(false)
    if (r.ok) setData(await r.json())
  }, [id])
  useEffect(() => {
    load()
  }, [load])

  if (!id) return <p className="cq-muted">Save the site first, then connect its domains here.</p>
  if (!data) return <div className="cq-domains cq-muted">Checking domains…</div>

  const connect = async () => {
    setBusy(true)
    setError(null)
    const r = await fetch(`/api/tenants/${id}/domains/connect`, { method: 'POST', credentials: 'include' })
    const json = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setError(json.error || 'Could not connect the domains.')
    setData(json)
    if (json.errors?.length) setError(json.errors.join(' '))
  }

  const needsConnect = data.domains.some((d) => d.status === 'not-connected' || d.status === 'needs-verification')
  const pending = data.domains.filter((d) => d.records.length)

  return (
    <section className="cq-domains" aria-label="Domains and setup">
      <div className="cq-domains__cols">
        <div>
          <h3>Domains</h3>
          {!data.configured ? (
            <p className="cq-reply__warning">
              Vercel is not connected to the portal yet, so domains must be added by hand in Vercel. Set VERCEL_TOKEN and VERCEL_PROJECT_ID to manage them here.
            </p>
          ) : data.domains.length === 0 ? (
            <p className="cq-muted">Add the main domain above and save. Then connect it here.</p>
          ) : (
            <>
              <ul className="cq-domains__list">
                {data.domains.map((d) => (
                  <li key={d.domain}>
                    <span className={`cq-state cq-state--${STATUS[d.status].tone}`}>{STATUS[d.status].label}</span>{' '}
                    {d.status === 'live' ? (
                      <a href={`https://${d.domain}`} target="_blank" rel="noreferrer">
                        {d.domain} ↗
                      </a>
                    ) : (
                      <b>{d.domain}</b>
                    )}
                    {d.redirectTo && <span className="cq-muted"> → forwards to {d.redirectTo}</span>}
                    {d.message && <span className="cq-muted"> ({d.message})</span>}
                  </li>
                ))}
              </ul>
              {modified && <p className="cq-reply__warning">Save your changes before connecting domains.</p>}
              <div className="cq-domains__actions">
                {needsConnect && (
                  <button type="button" className="btn btn--style-primary btn--size-small" onClick={connect} disabled={busy || modified}>
                    {busy ? 'Working…' : 'Connect domains'}
                  </button>
                )}
                <button type="button" className="btn btn--style-secondary btn--size-small" onClick={load} disabled={busy}>
                  {busy ? 'Checking…' : 'Check again'}
                </button>
              </div>
              {error && <p role="alert" className="cq-reply__error">{error}</p>}
              {pending.length > 0 && (
                <div className="cq-domains__dns">
                  <p>
                    <b>Give these DNS records to whoever manages the domain</b> (at the registrar, e.g. Whogohost → DNS zone). Changes usually work within an hour,
                    sometimes up to 48 hours. HTTPS is set up automatically.
                  </p>
                  <div className="cq-domains__tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Domain</th>
                          <th>Type</th>
                          <th>Name</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.flatMap((d) =>
                          d.records.map((r) => (
                            <tr key={d.domain + r.type + r.name} title={r.why}>
                              <td>{d.domain}</td>
                              <td>{r.type}</td>
                              <CopyCell value={r.name} />
                              <CopyCell value={r.value} />
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="cq-muted">Remove any other A or CNAME records for the same names, and set TTL to the lowest option.</p>
                </div>
              )}
            </>
          )}
          {data.previewUrl && (
            <p className="cq-muted">
              Preview address (works before DNS):{' '}
              <a href={data.previewUrl} target="_blank" rel="noreferrer">
                {data.previewUrl.replace('https://', '')} ↗
              </a>
            </p>
          )}
        </div>
        <div>
          <h3>Setup checklist</h3>
          <ul className="cq-checklist">
            {data.checklist.map((c) => (
              <li key={c.label} className={c.done ? 'is-done' : ''}>
                <span aria-hidden="true">{c.done ? '✓' : '○'}</span> <span className="cq-sr-only">{c.done ? 'Done: ' : 'To do: '}</span>
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
