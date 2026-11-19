import type { Endpoint } from 'payload'

import { isPlatformAdmin } from '../access'
import { RESERVED_SLUGS } from './reserved'
import { CHAMBERS, type Chamber } from './themes'

const fail = (error: string, status: number) => Response.json({ error }, { status })

/** "Hon. Ada Okafor" → "adaokafor", for the site's slug and preview address. */
export const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(hon|honourable|honorable|sen|senator|distinguished|rt|dr|prof|engr|barr|alhaji|chief|mrs?|ms)\b\.?/g, '')
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 40) || 'legislator'

/**
 * POST /api/leads/:id/create-site  { chamber? }
 * Starts the legislator site for a signed lead (name and template from the lead), links it to the lead
 * and marks the lead Signed. Then continue with the onboarding guide from step 3.
 */
export const createSiteFromLeadEndpoint: Endpoint = {
  path: '/:id/create-site',
  method: 'post',
  handler: async (req) => {
    if (!isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0])) return fail('Only the Civiq team can create sites.', 403)
    const lead = await req.payload.findByID({ collection: 'leads', id: String(req.routeParams?.id ?? ''), depth: 0, overrideAccess: true }).catch(() => null)
    if (!lead) return fail('Lead not found.', 404)
    if (lead.site) return Response.json({ ok: true, siteId: typeof lead.site === 'object' ? lead.site.id : lead.site, existed: true })

    const input = (await req.json?.().catch(() => ({}))) as { chamber?: string }
    const chamber = (input.chamber || lead.chamber) as Chamber
    if (!(chamber in CHAMBERS)) return fail('Choose Senate or House of Representatives first.', 400)
    const name = (lead.legislatorName || '').trim()
    if (!name) return fail('This lead has no legislator name.', 400)

    const base = slugFromName(name)
    let slug = RESERVED_SLUGS.has(base) ? `${base}-site` : base
    for (let i = 2; (await req.payload.count({ collection: 'tenants', where: { slug: { equals: slug } }, overrideAccess: true })).totalDocs > 0; i++) {
      slug = `${base}${i}`
    }
    const site = await req.payload.create({ collection: 'tenants', data: { name, chamber, slug, status: 'active' }, overrideAccess: true })
    await req.payload.update({ collection: 'leads', id: lead.id, data: { status: 'signed', site: site.id, chamber }, overrideAccess: true })
    return Response.json({ ok: true, siteId: site.id })
  },
}
