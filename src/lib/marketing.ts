import { cache } from 'react'

import { getClient, imageUrl } from './payload'
import { themeOf } from './themes'

/** Legislator sites shown on theciviq.com.ng: opted in, active and with a main domain. */
export const getShowcase = cache(async () => {
  const payload = await getClient()
  const tenants = await payload.find({
    collection: 'tenants',
    where: { and: [{ showcase: { equals: true } }, { status: { equals: 'active' } }, { primaryDomain: { exists: true } }] },
    sort: 'name',
    limit: 24,
    depth: 0,
    overrideAccess: true,
  })
  return Promise.all(
    tenants.docs
      .filter((t) => t.primaryDomain)
      .map(async (t) => {
        const s = (await payload.find({ collection: 'site-settings', where: { tenant: { equals: t.id } }, limit: 1, depth: 1, overrideAccess: true })).docs[0]
        return {
          id: t.id,
          name: s?.name || t.name,
          place: [s?.constituency, s?.state].filter(Boolean).join(', '),
          chamber: themeOf(t),
          domain: t.primaryDomain as string,
          portrait: imageUrl(s?.hero?.image, 'card') ?? null,
        }
      }),
  )
})

export const getCiviqSettings = cache(async () => {
  const payload = await getClient()
  return payload.findGlobal({ slug: 'civiq-settings', depth: 0, overrideAccess: true }).catch(() => null)
})

export const leadConsentText =
  'I agree that Civiq may contact me about this request by phone, WhatsApp or email, and store these details as described in the Civiq privacy notice.'
