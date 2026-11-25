import { type Access, APIError, type CollectionConfig, type FieldAccess, Forbidden, ValidationError } from 'payload'

import { idOf, isPlatformAdmin, PLATFORM_ROLES, tenantIdsFor } from '../access'
import { appForHost, requestHost } from '../lib/apps'
import { getPortalUrl } from '../lib/site-url'
import { inviteEndpoint, inviteOptionsEndpoint, resendInviteEndpoint, touchLastSeen } from '../lib/team'

const MIN_PASSWORD_LENGTH = 10

type UserArg = Parameters<typeof isPlatformAdmin>[0]
const userOf = (req: { user?: unknown }) => req.user as UserArg

const adminTenants = (req: { user?: unknown }) => tenantIdsFor(userOf(req), ['admin'])

// Platform admins manage everyone. A tenant admin manages the accounts of their own team.
// Everyone else can only see and edit themselves.
const canManageUsers: Access = ({ req }) => isPlatformAdmin(userOf(req)) || adminTenants(req).length > 0

const updateAccess: Access = ({ req }) => {
  if (!req.user) return false
  if (isPlatformAdmin(userOf(req))) return true
  const ids = adminTenants(req)
  const self = { id: { equals: req.user.id } }
  return ids.length ? { or: [self, { 'tenants.tenant': { in: ids } }] } : self
}

const deleteAccess: Access = ({ req }) => {
  if (!req.user) return false
  const notSelf = { id: { not_equals: req.user.id } }
  if (isPlatformAdmin(userOf(req))) return notSelf
  const ids = adminTenants(req)
  return ids.length ? { and: [notSelf, { 'tenants.tenant': { in: ids } }] } : false
}

const platformAdminField: FieldAccess = ({ req }) => isPlatformAdmin(userOf(req))
const teamManagerField: FieldAccess = ({ req }) => isPlatformAdmin(userOf(req)) || adminTenants(req).length > 0

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: {
    group: 'Team',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'teamStatus', 'lastSeenAt'],
    description: 'People who can log in to the Civiq Portal. Team admins invite and remove members of their own team.',
    components: { beforeListTable: ['@/components/portal/InviteForm#InviteForm'] },
  },
  endpoints: [inviteOptionsEndpoint, inviteEndpoint, resendInviteEndpoint],
  auth: {
    tokenExpiration: 60 * 60 * 8, // log out after 8 hours
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // lock the account for 15 minutes after 5 failed attempts
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  access: {
    // The Civiq Admin address is for the Civiq team only; checked on every page, not just at login.
    admin: ({ req }) => Boolean(req.user) && (appForHost(requestHost(req.headers)) !== 'admin' || isPlatformAdmin(userOf(req))),
    read: ({ req }) => Boolean(req.user), // the plugin narrows this to self + users of the same tenants
    create: canManageUsers,
    update: updateAccess,
    delete: deleteAccess,
  },
  hooks: {
    beforeLogin: [
      // A friendly refusal for legislators' teams who try the Civiq Admin address.
      ({ req, user }) => {
        if (appForHost(requestHost(req.headers)) === 'admin' && !isPlatformAdmin(user as UserArg)) {
          const err = new APIError(`This sign-in is for the Civiq team. Please log in at ${getPortalUrl().replace(/^https?:\/\//, '')}.`, 403, null, true)
          err.name = 'CiviqTeamOnly' // a named error is shown as-is on the login screen
          throw err
        }
        return user
      },
    ],
    afterLogin: [({ req, user }) => touchLastSeen(req, user)],
    beforeValidate: [
      ({ data }) => {
        if (data?.password && String(data.password).length < MIN_PASSWORD_LENGTH) {
          throw new ValidationError({
            collection: 'users',
            errors: [{ path: 'password', message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` }],
          })
        }
        return data
      },
    ],
    beforeChange: [
      // A tenant admin may only add, change or remove team rows for tenants they administer;
      // rows for any other tenant are kept exactly as they were.
      ({ req, data, originalDoc }) => {
        const user = userOf(req)
        if (!user || isPlatformAdmin(user) || !data || !('tenants' in data)) return data
        const managed = adminTenants(req).map(String)
        const isManaged = (row: { tenant?: unknown }) => managed.includes(String(idOf(row.tenant)))
        const original = (originalDoc?.tenants ?? []) as { tenant?: unknown }[]
        const incoming = (data.tenants ?? []) as { tenant?: unknown }[]
        data.tenants = [...original.filter((r) => !isManaged(r)), ...incoming.filter(isManaged)]
        return data
      },
    ],
    beforeDelete: [
      // Tenant admins cannot delete an account that also works for another legislator.
      async ({ req, id }) => {
        const user = userOf(req)
        if (!user || isPlatformAdmin(user)) return
        const target = await req.payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true, req })
        const managed = adminTenants(req).map(String)
        const others = (target.tenants ?? []).filter((r) => !managed.includes(String(idOf(r.tenant))))
        if (others.length || target.platformRole === 'platform-admin') throw new Forbidden(req.t)
      },
    ],
  },
  fields: [
    { name: 'inviteStatus', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/components/portal/InviteStatus#InviteStatus' }, disableListColumn: true } },
    { name: 'name', type: 'text', required: true },
    // Set by the server only: invites and portal activity.
    { name: 'invitedAt', type: 'date', admin: { hidden: true }, access: { create: () => false, update: () => false } },
    { name: 'invitedByName', type: 'text', admin: { hidden: true }, access: { create: () => false, update: () => false } },
    {
      name: 'lastSeenAt',
      label: 'Last active',
      type: 'date',
      admin: { hidden: true, date: { pickerAppearance: 'dayAndTime' } },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'teamStatus',
      label: 'Status',
      type: 'text',
      virtual: true,
      admin: { components: { Cell: '@/components/portal/StatusCell#StatusCell' }, hidden: true },
      hooks: { afterRead: [({ data }) => (data?.lastSeenAt ? 'Active' : data?.invitedAt ? 'Invited, not joined yet' : 'No activity recorded yet')] },
    },
    // The pre-Civiq single-site role. Kept (hidden, read-only) only so the multi-tenant migration can
    // copy each user's role onto their team; remove in the next release together with its column.
    {
      name: 'role',
      type: 'select',
      options: ['superadmin', 'editor', 'contributor'],
      admin: { hidden: true, readOnly: true },
      access: { create: () => false, update: () => false, read: platformAdminField },
    },
    {
      name: 'platformRole',
      label: 'Civiq role',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: [...PLATFORM_ROLES],
      saveToJWT: true,
      admin: {
        position: 'sidebar',
        description: 'Platform admins are the Civiq team and can manage every site. Everyone else is a member of one or more legislator teams.',
      },
      access: { create: platformAdminField, update: platformAdminField },
      hooks: {
        beforeChange: [
          // The very first account (created on the "Create first user" screen) becomes a platform admin.
          async ({ req, operation, value }) => {
            if (operation !== 'create') return value
            const { totalDocs } = await req.payload.count({ collection: 'users', req })
            return totalDocs === 0 ? 'platform-admin' : value
          },
        ],
      },
    },
  ],
}

export { teamManagerField }
