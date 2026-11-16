import { type Access, type CollectionBeforeChangeHook, Forbidden, type PayloadRequest, type Where } from 'payload'

// Civiq roles
//  Platform level (user.platformRole):
//    platform-admin – the Civiq team: every tenant, onboarding, user management
//  Tenant level (a row in user.tenants for each legislator the user works for):
//    admin       – that legislator's team lead: all content, inbox and the team's user accounts
//    editor      – all content, settings and the inbox
//    contributor – can write and edit drafts, but cannot publish, delete, or see the inbox
export const PLATFORM_ROLES = [
  { label: 'Civiq platform admin', value: 'platform-admin' },
  { label: 'Member', value: 'member' },
] as const

export const TENANT_ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Contributor', value: 'contributor' },
] as const

export type TenantRole = (typeof TENANT_ROLES)[number]['value']

type ID = number | string
type UserLike = {
  id: ID
  platformRole?: string | null
  tenants?: { tenant?: ID | { id: ID } | null; role?: string | null }[] | null
}

export const idOf = (v: unknown): ID | null =>
  v && typeof v === 'object' && 'id' in v ? ((v as { id: ID }).id ?? null) : ((v as ID | null | undefined) ?? null)

const userOf = (req: PayloadRequest) => req.user as unknown as UserLike | null

export const isPlatformAdmin = (user: UserLike | null | undefined) => user?.platformRole === 'platform-admin'

/** IDs of the tenants where the user holds one of `roles`. */
export const tenantIdsFor = (user: UserLike | null | undefined, roles: readonly TenantRole[]): ID[] =>
  (user?.tenants ?? [])
    .filter((row) => row.role && roles.includes(row.role as TenantRole))
    .map((row) => idOf(row.tenant))
    .filter((id): id is ID => id !== null)

/** The user's role in one tenant, if any. */
export const roleIn = (user: UserLike | null | undefined, tenant: unknown): TenantRole | null => {
  const id = idOf(tenant)
  const row = (user?.tenants ?? []).find((r) => String(idOf(r.tenant)) === String(id))
  return (row?.role as TenantRole) ?? null
}

const sameId = (ids: ID[], id: ID) => ids.some((i) => String(i) === String(id))

export const anyone: Access = () => true
export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
export const platformAdminOnly: Access = ({ req }) => isPlatformAdmin(userOf(req))

/**
 * Allows users holding one of `roles` in the document's tenant (platform admins always).
 * Narrows lists and updates to those tenants. The exact check for each save is done by
 * `guardTenantWrite`, which runs after the tenant field has its final value.
 */
export const tenantRole =
  (...roles: TenantRole[]): Access =>
  ({ req, data }) => {
    const user = userOf(req)
    if (!user) return false
    if (isPlatformAdmin(user)) return true
    const ids = tenantIdsFor(user, roles)
    if (!ids.length) return false
    const tenant = idOf(data?.tenant)
    if (tenant !== null) return sameId(ids, tenant)
    return { tenant: { in: ids } } satisfies Where
  }

// Public visitors only see published documents; logged-in team members see drafts too.
export const publishedOrLoggedIn: Access = ({ req }) => (req.user ? true : { _status: { equals: 'published' } })

// Editors and admins can publish. Contributors can only save drafts.
export const canWriteContent: Access = (args) =>
  args.data?._status === 'published' ? tenantRole('admin', 'editor')(args) : tenantRole('admin', 'editor', 'contributor')(args)

/**
 * Final server-side check on every create/update: the user must hold one of `roles` in the
 * document's tenant, and contributors may never publish. Runs after defaults are applied,
 * so it also covers documents whose tenant came from the admin's tenant selector.
 */
export const guardTenantWrite =
  (roles: TenantRole[], opts: { contributorsDraftOnly?: boolean } = {}): CollectionBeforeChangeHook =>
  ({ req, data, originalDoc }) => {
    const user = userOf(req)
    // Trusted server code (seed, migrations, the contact form) runs without a user.
    if (!user || isPlatformAdmin(user)) return data
    const tenant = data?.tenant ?? originalDoc?.tenant
    const role = roleIn(user, tenant)
    if (!role || !roles.includes(role)) throw new Forbidden(req.t)
    if (opts.contributorsDraftOnly && role === 'contributor' && data?._status === 'published') {
      throw new Forbidden(req.t)
    }
    return data
  }
