import type { Endpoint, PayloadRequest } from 'payload'

import { isPlatformAdmin, roleIn } from '../access'
import type { Tenant } from '@/payload-types'
import { countPlaceholders } from './insights'
import { getRootDomain } from './site-url'
import { connectDomain, domainState, type DomainState, vercelConfigured, verifyDomain } from './vercel'

const fail = (error: string, status: number) => Response.json({ error }, { status })

async function loadTenant(req: PayloadRequest): Promise<Tenant | Response> {
  if (!isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0])) return fail('Only the Civiq team can manage domains.', 403)
  const t = await req.payload.findByID({ collection: 'tenants', id: String(req.routeParams?.id ?? ''), depth: 0, overrideAccess: true }).catch(() => null)
  return t ?? fail('Site not found.', 404)
}

/** The site's domains: the main one first, then the others, which forward to the main one. */
const domainsOf = (t: Tenant) => {
  const main = t.primaryDomain || null
  const others = (t.domains ?? []).map((d) => d.domain).filter((d): d is string => Boolean(d) && d !== main)
  return [...(main ? [{ domain: main, redirectTo: null }] : []), ...others.map((d) => ({ domain: d, redirectTo: main }))]
}

async function states(t: Tenant): Promise<DomainState[]> {
  if (!vercelConfigured()) return []
  return Promise.all(domainsOf(t).map(({ domain }) => domainState(domain).catch((e: Error) => ({ domain, status: 'error' as const, redirectTo: null, records: [], message: e.message }))))
}

/** Onboarding checklist for the site, shown next to the domains. */
async function checklist(req: PayloadRequest, t: Tenant, domains: DomainState[]) {
  const [placeholders, team] = await Promise.all([
    countPlaceholders(req.payload, Number(t.id)),
    req.payload.find({ collection: 'users', where: { 'tenants.tenant': { equals: t.id } }, limit: 100, depth: 0, overrideAccess: true }),
  ])
  const admins = team.docs.filter((u) => roleIn(u, t.id) === 'admin')
  const settings = (await req.payload.find({ collection: 'site-settings', where: { tenant: { equals: t.id } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  const main = domains.find((d) => d.domain === t.primaryDomain)
  return [
    { done: placeholders === 0, label: placeholders ? `Replace ${placeholders} placeholder text${placeholders === 1 ? '' : 's'} (“[…]”) in Site settings and About` : 'Site settings and About filled in' },
    { done: Boolean(settings?.contact?.address && !/^\s*\[/.test(settings.contact.address) && settings?.contact?.email && !/^\s*\[/.test(settings.contact.email)), label: 'Office email and address set (needed for replies and newsletters)' },
    { done: admins.length > 0, label: admins.length ? `Team admin: ${admins.map((a) => a.name).join(', ')}` : 'Invite the team admin (Team → Users → Invite a team member)' },
    { done: admins.some((a) => a.lastSeenAt), label: admins.some((a) => a.lastSeenAt) ? 'Team admin has logged in' : 'Team admin has not logged in yet' },
    { done: main?.status === 'live', label: t.primaryDomain ? (main?.status === 'live' ? `${t.primaryDomain} is live` : `${t.primaryDomain} is not live yet`) : 'Set the main domain' },
  ]
}

const payloadFor = async (req: PayloadRequest, t: Tenant) => {
  const domains = await states(t)
  const root = getRootDomain()
  return {
    configured: vercelConfigured(),
    previewUrl: root ? `https://${t.slug}.${root}` : null,
    domains,
    checklist: await checklist(req, t, domains),
  }
}

/** GET /api/tenants/:id/domains — status of each domain, the DNS records to set, and the setup checklist. */
export const domainStatusEndpoint: Endpoint = {
  path: '/:id/domains',
  method: 'get',
  handler: async (req) => {
    const t = await loadTenant(req)
    if (t instanceof Response) return t
    return Response.json(await payloadFor(req, t))
  },
}

/** POST /api/tenants/:id/domains/connect — adds any missing domains to Vercel and re-checks ownership. */
export const domainConnectEndpoint: Endpoint = {
  path: '/:id/domains/connect',
  method: 'post',
  handler: async (req) => {
    const t = await loadTenant(req)
    if (t instanceof Response) return t
    if (!vercelConfigured()) return fail('Vercel is not connected: set VERCEL_TOKEN and VERCEL_PROJECT_ID.', 503)
    const errors: string[] = []
    for (const { domain, redirectTo } of domainsOf(t)) {
      const now = await domainState(domain)
      if (now.status === 'not-connected') {
        const r = await connectDomain(domain, redirectTo)
        if (!r.ok) errors.push(`${domain}: ${r.message}`)
      } else if (now.status === 'needs-verification') {
        await verifyDomain(domain)
      }
    }
    return Response.json({ ...(await payloadFor(req, t)), errors })
  },
}
