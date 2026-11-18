import { cookies } from 'next/headers'
import type { Payload } from 'payload'

import { idOf, isPlatformAdmin, roleIn, type TenantRole } from '@/access'
import { touchLastSeen } from '@/lib/team'
import type { Tenant, User } from '@/payload-types'

export type PortalContext = {
  user: User
  platformAdmin: boolean
  tenant: Tenant | null
  role: TenantRole | null
  /** Admins and editors see supporters, messages and audiences; contributors only content. */
  canSeeCommunity: boolean
}

/**
 * The legislator the signed-in user is working on: the one picked in the portal's Legislator menu
 * (a cookie set by the multi-tenant plugin), or their only one. The pick is ignored unless the user
 * actually belongs to that legislator's team (platform admins may view any).
 */
export async function getPortalContext(payload: Payload, rawUser: unknown): Promise<PortalContext> {
  const user = rawUser as User
  const platformAdmin = isPlatformAdmin(user)
  await touchLastSeen({ payload }, user) // someone who joins through an invite link lands here first
  const memberOf = (user.tenants ?? []).map((r) => Number(idOf(r.tenant)))
  const picked = Number((await cookies()).get('payload-tenant')?.value) || null

  let tenantId = picked && (platformAdmin || memberOf.includes(picked)) ? picked : null
  // Team members with a single legislator get it by default; platform admins see the all-sites overview
  // until they pick one, matching the (empty) Legislator menu.
  if (!tenantId && memberOf.length === 1 && !platformAdmin) tenantId = memberOf[0]!

  const tenant = tenantId
    ? await payload.findByID({ collection: 'tenants', id: tenantId, depth: 0, overrideAccess: true }).catch(() => null)
    : null
  const role: TenantRole | null = tenant ? (platformAdmin ? 'admin' : roleIn(user, tenant.id)) : null
  return { user, platformAdmin, tenant, role, canSeeCommunity: role === 'admin' || role === 'editor' }
}

export const fmt = (n: number) => n.toLocaleString('en-NG')
export const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)
