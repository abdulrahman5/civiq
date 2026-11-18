'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Options = { tenants: { id: number; name: string }[]; roles: { value: string; label: string; help: string }[] }
type Result = { kind: 'ok' | 'error'; text: string; inviteUrl?: string | null }

/** Shows a one-time invite link with copy and WhatsApp buttons. */
export function InviteLink({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const message = `Hello ${name.split(' ')[0]}, here is your invite to the Civiq Portal. Open it to choose your password (it works once and expires in 7 days): ${url}`
  return (
    <div className="cq-invite__link">
      <p className="cq-muted">Or send them this link yourself. It works once and expires in 7 days; don’t post it in a group.</p>
      <div className="cq-invite__linkrow">
        <input readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => {})
            setCopied(true)
          }}
        >
          {copied ? 'Copied' : 'Copy link'}
        </button>
        <a className="btn btn--style-secondary btn--size-small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
      </div>
    </div>
  )
}

// Above the Users list: invite a team member by email.
export function InviteForm() {
  const router = useRouter()
  const [options, setOptions] = useState<Options | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [tenant, setTenant] = useState('')
  const [role, setRole] = useState('editor')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [invitedName, setInvitedName] = useState('')

  useEffect(() => {
    fetch('/api/users/invite-options', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o: Options | null) => {
        if (!o) return
        setOptions(o)
        // Default to the legislator picked in the portal's menu, when it is one they can invite to.
        const picked = Number(document.cookie.match(/(?:^|; )payload-tenant=(\d+)/)?.[1])
        setTenant(String(o.tenants.find((t) => t.id === picked)?.id ?? o.tenants[0]?.id ?? ''))
      })
  }, [])

  if (!options?.tenants.length) return null // only team admins and platform admins can invite

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    const r = await fetch('/api/users/invite', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, tenant: Number(tenant), role }),
    })
    const json = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) return setResult({ kind: 'error', text: json.error || 'The invite could not be sent.' })
    setInvitedName(json.user?.name ?? name)
    const team = options.tenants.find((t) => String(t.id) === tenant)?.name ?? 'the team'
    setResult({
      kind: 'ok',
      text: json.existing
        ? `${json.user?.name} already had an account and has been added to ${team}${json.emailed ? '. We emailed them.' : '.'}`
        : json.emailed
          ? `Invite emailed to ${email.trim().toLowerCase()}.`
          : `Invite created for ${email.trim().toLowerCase()}, but email is not set up on this server, so share the link below.`,
      inviteUrl: json.inviteUrl,
    })
    setName('')
    setEmail('')
    router.refresh()
  }

  const roleHelp = options.roles.find((r) => r.value === role)?.help

  return (
    <section className="cq-invite" aria-label="Invite a team member">
      {!open ? (
        <button type="button" className="btn btn--style-primary btn--size-medium" onClick={() => setOpen(true)}>
          Invite a team member
        </button>
      ) : (
        <form onSubmit={submit} className="cq-invite__form">
          <h3>Invite a team member</h3>
          <p className="cq-muted">They get an email with a link to choose their own password. You never need to know it.</p>
          <div className="cq-invite__grid">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="off" />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </label>
            {options.tenants.length > 1 && (
              <label>
                Team
                <select value={tenant} onChange={(e) => setTenant(e.target.value)}>
                  {options.tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {options.roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {roleHelp && <p className="cq-muted cq-invite__help">{options.roles.find((r) => r.value === role)?.label}s {roleHelp}.</p>}
          <div className="cq-invite__actions">
            <button type="submit" className="btn btn--style-primary btn--size-medium" disabled={busy}>
              {busy ? 'Sending…' : 'Send invite'}
            </button>
            <button type="button" className="btn btn--style-secondary btn--size-medium" onClick={() => { setOpen(false); setResult(null) }}>
              Close
            </button>
          </div>
          {result && (
            <p role={result.kind === 'error' ? 'alert' : 'status'} className={result.kind === 'error' ? 'cq-reply__error' : 'cq-reply__ok'}>
              {result.text}
            </p>
          )}
          {result?.inviteUrl && <InviteLink url={result.inviteUrl} name={invitedName} />}
        </form>
      )}
    </section>
  )
}
