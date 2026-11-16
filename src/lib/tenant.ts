import { cache } from 'react'

import type { Tenant } from '@/payload-types'
import { normaliseDomain } from '../collections/Tenants'
import { getClient } from './payload'
import { getRootDomain } from './site-url'

// Hosts that are not a legislator's own domain but should still show a site:
// local development and Vercel deployment addresses (e.g. project-sma.vercel.app).
const isFallbackHost = (host: string) => host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')

const findOne = async (where: Parameters<Awaited<ReturnType<typeof getClient>>['find']>[0]['where']) =>
  (await getClient())
    .find({ collection: 'tenants', where: { and: [{ status: { equals: 'active' } }, where!] }, limit: 1, depth: 0, overrideAccess: true })
    .then((r) => r.docs[0] ?? null)

/**
 * Finds the legislator site for a request's host, in this order:
 *   1. its main or extra domains (www. and bare forms both match)
 *   2. a preview address <slug>.<PLATFORM_ROOT_DOMAIN> or <slug>.localhost
 *   3. on localhost / *.vercel.app: DEFAULT_TENANT_SLUG, else the first site created
 */
export const getTenantByHost = cache(async (rawHost: string): Promise<Tenant | null> => {
  const host = normaliseDomain(decodeURIComponent(rawHost))
  const bare = host.replace(/^www\./, '')
  const candidates = [...new Set([host, bare, `www.${bare}`])]

  const byDomain = await findOne({
    or: [{ primaryDomain: { in: candidates } }, { 'domains.domain': { in: candidates } }],
  })
  if (byDomain) return byDomain

  const root = getRootDomain()
  const sub =
    (root && host.endsWith(`.${root}`) && host.slice(0, -root.length - 1)) ||
    (host.endsWith('.localhost') && host.slice(0, -'.localhost'.length)) ||
    null
  if (sub && !sub.includes('.')) {
    const bySlug = await findOne({ slug: { equals: sub } })
    if (bySlug) return bySlug
  }

  if (isFallbackHost(host)) {
    if (process.env.DEFAULT_TENANT_SLUG) return findOne({ slug: { equals: process.env.DEFAULT_TENANT_SLUG } })
    return (await getClient())
      .find({ collection: 'tenants', where: { status: { equals: 'active' } }, sort: 'createdAt', limit: 1, depth: 0, overrideAccess: true })
      .then((r) => r.docs[0] ?? null)
  }
  return null
})

/** The canonical address of a legislator's site: its main domain, else the address it was reached on. */
export const tenantSiteUrl = (tenant: Tenant, host: string) => {
  const h = tenant.primaryDomain || normaliseDomain(decodeURIComponent(host))
  const local = h === 'localhost' || h.endsWith('.localhost') || h === '127.0.0.1'
  return local ? `http://${h}:${process.env.PORT || 3000}` : `https://${h}`
}

/** Search engines may index a site only on its main domain (never previews, vercel.app or localhost). */
export const isIndexable = (tenant: Tenant, host: string) =>
  Boolean(tenant.primaryDomain) && normaliseDomain(decodeURIComponent(host)) === tenant.primaryDomain
