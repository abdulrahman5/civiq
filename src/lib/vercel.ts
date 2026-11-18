// Connecting legislators' domains to the Civiq project on Vercel, from the portal.
// Needs VERCEL_TOKEN (an access token with access to the project), VERCEL_PROJECT_ID and, when the
// project belongs to a Vercel team, VERCEL_TEAM_ID. VERCEL_API_URL is only overridden in tests.

export type DnsRecord = { type: 'A' | 'CNAME' | 'TXT'; name: string; value: string; why: string }
export type DomainState = {
  domain: string
  status: 'not-connected' | 'needs-verification' | 'dns-pending' | 'live' | 'error'
  redirectTo: string | null
  records: DnsRecord[] // what to set at the registrar (empty when live)
  message?: string
}

const api = () => (process.env.VERCEL_API_URL || 'https://api.vercel.com').replace(/\/$/, '')
export const vercelConfigured = () => Boolean(process.env.VERCEL_TOKEN && process.env.VERCEL_PROJECT_ID)

async function call<T>(method: string, path: string, body?: object): Promise<{ ok: boolean; status: number; json: T & { error?: { code?: string; message?: string } } }> {
  const url = new URL(api() + path)
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID)
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  })
  return { ok: r.ok, status: r.status, json: (await r.json().catch(() => ({}))) as never }
}

type ProjectDomain = { name: string; apexName: string; verified: boolean; redirect?: string | null; verification?: { type: string; domain: string; value: string; reason: string }[] }
type DomainConfig = { misconfigured: boolean; recommendedIPv4?: { rank: number; value: string[] }[]; recommendedCNAME?: { rank: number; value: string }[] }

const project = () => encodeURIComponent(process.env.VERCEL_PROJECT_ID || '')
const best = <T extends { rank: number }>(xs?: T[]) => [...(xs ?? [])].sort((a, b) => a.rank - b.rank)[0]

/** The host part to type in the registrar's "Name" box: "@" for the bare domain, "www" for www.x.ng. */
const hostLabel = (domain: string, apex: string) => (domain === apex ? '@' : domain.slice(0, -(apex.length + 1)))

/** Looks up one domain: whether it is on the project, verified, and pointing at Vercel. */
export async function domainState(domain: string): Promise<DomainState> {
  const pd = await call<ProjectDomain>('GET', `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}`)
  if (pd.status === 404) return { domain, status: 'not-connected', redirectTo: null, records: [] }
  if (!pd.ok) return { domain, status: 'error', redirectTo: null, records: [], message: pd.json.error?.message || `Vercel returned ${pd.status}` }

  const d = pd.json
  const records: DnsRecord[] = []
  if (!d.verified) {
    for (const v of d.verification ?? []) {
      if (v.type === 'TXT') records.push({ type: 'TXT', name: hostLabel(v.domain, d.apexName), value: v.value, why: 'Proves the domain belongs to you (it is already used on another Vercel account).' })
    }
    return { domain, status: 'needs-verification', redirectTo: d.redirect ?? null, records }
  }

  const cfg = await call<DomainConfig>('GET', `/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${project()}`)
  if (!cfg.ok) return { domain, status: 'error', redirectTo: d.redirect ?? null, records: [], message: cfg.json.error?.message || `Vercel returned ${cfg.status}` }
  if (!cfg.json.misconfigured) return { domain, status: 'live', redirectTo: d.redirect ?? null, records: [] }

  const label = hostLabel(domain, d.apexName)
  if (label === '@') {
    records.push({ type: 'A', name: '@', value: best(cfg.json.recommendedIPv4)?.value?.[0] || '76.76.21.21', why: 'Points the domain at Civiq.' })
  } else {
    records.push({ type: 'CNAME', name: label, value: (best(cfg.json.recommendedCNAME)?.value || 'cname.vercel-dns.com').replace(/\.$/, ''), why: 'Points this address at Civiq.' })
  }
  return { domain, status: 'dns-pending', redirectTo: d.redirect ?? null, records }
}

/** Adds a domain to the project (no-op if it is already there). `redirectTo` makes it forward to the main domain. */
export async function connectDomain(domain: string, redirectTo: string | null): Promise<{ ok: boolean; message?: string }> {
  const r = await call<ProjectDomain>('POST', `/v10/projects/${project()}/domains`, {
    name: domain,
    ...(redirectTo ? { redirect: redirectTo, redirectStatusCode: 308 } : {}),
  })
  if (r.ok) return { ok: true }
  const code = r.json.error?.code ?? ''
  if (r.status === 409 && /already|exists|in_use/i.test(code + (r.json.error?.message ?? '')) && (await domainState(domain)).status !== 'not-connected') return { ok: true }
  return { ok: false, message: r.json.error?.message || `Vercel returned ${r.status}` }
}

/** Asks Vercel to re-check the ownership TXT record. */
export async function verifyDomain(domain: string) {
  await call('POST', `/v9/projects/${project()}/domains/${encodeURIComponent(domain)}/verify`)
}
