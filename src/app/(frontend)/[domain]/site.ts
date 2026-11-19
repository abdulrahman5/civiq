import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getSettings, initials } from '@/lib/payload'
import { getTenantByHost, tenantSiteUrl } from '@/lib/tenant'
import { themeOf } from '@/lib/themes'
import type { SiteSetting, Tenant } from '@/payload-types'

export type DomainParams = { params: Promise<{ domain: string }> }

/** Settings to fall back on for a new site whose team has not filled in Site settings yet. */
const starterSettings = (tenant: Tenant): SiteSetting =>
  ({ id: 0, tenant: tenant.id, name: tenant.name, shortName: initials(tenant.name), office: themeOf(tenant).office, hero: { headline: tenant.name } }) as SiteSetting

/** The legislator site for this request's domain, or the "site not found" page. */
export const loadSite = cache(async (domain: string) => {
  const tenant = await getTenantByHost(domain)
  if (!tenant) notFound()
  const settings = (await getSettings(tenant.id)) ?? starterSettings(tenant)
  return { tenant, settings, domain, siteUrl: tenantSiteUrl(tenant, domain) }
})

export const siteFromParams = async ({ params }: DomainParams) => loadSite((await params).domain)
