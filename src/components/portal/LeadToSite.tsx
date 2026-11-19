'use client'

import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useState } from 'react'

import { CHAMBER_OPTIONS } from '@/lib/themes'

// Sidebar on a lead: turn a signed lead into a new legislator site (name and template come from the lead).
export function LeadToSite() {
  const { id } = useDocumentInfo()
  const site = useFormFields(([f]) => f.site?.value as number | { id: number } | undefined)
  const leadChamber = useFormFields(([f]) => f.chamber?.value as string | undefined)
  const legislator = useFormFields(([f]) => f.legislatorName?.value as string | undefined)
  const [chamber, setChamber] = useState(leadChamber === 'senate' || leadChamber === 'reps' ? leadChamber : '')
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({})

  if (!id) return null
  const siteId = site && typeof site === 'object' ? site.id : site
  if (siteId) {
    return (
      <section className="cq-send" aria-label="Legislator site">
        <h3>Legislator site</h3>
        <a className="btn btn--style-secondary btn--size-small" href={`/admin/collections/tenants/${siteId}`}>
          Open the site →
        </a>
      </section>
    )
  }

  const create = async () => {
    setState({ busy: true })
    const r = await fetch(`/api/leads/${id}/create-site`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chamber }),
    })
    const json = await r.json().catch(() => ({}))
    if (!r.ok) return setState({ error: json.error || 'Could not create the site.' })
    window.location.href = `/admin/collections/tenants/${json.siteId}`
  }

  return (
    <section className="cq-send" aria-label="Create legislator site">
      <h3>Signed?</h3>
      <p className="cq-muted cq-send__small">Start {legislator ? `${legislator}’s` : 'their'} site with the name and template from this lead, then follow the onboarding guide.</p>
      <label className="cq-send__small">
        Template{' '}
        <select value={chamber} onChange={(e) => setChamber(e.target.value)} className="cq-lead__select">
          <option value="">Choose…</option>
          {CHAMBER_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn--style-primary btn--size-small" onClick={create} disabled={!chamber || !legislator || state.busy}>
        {state.busy ? 'Creating…' : 'Create legislator site'}
      </button>
      {state.error && <p role="alert" className="cq-reply__error cq-send__small">{state.error}</p>}
    </section>
  )
}
