import crypto from 'node:crypto'
import type { Endpoint, PayloadRequest, Where } from 'payload'

import { idOf, isPlatformAdmin, roleIn, TENANT_ROLES, tenantIdsFor, type TenantRole } from '../access'
import type { User } from '@/payload-types'
import { getPortalUrl } from './site-url'

const INVITE_DAYS = 7
const ROLE_LABEL = Object.fromEntries(TENANT_ROLES.map((r) => [r.value, r.label])) as Record<TenantRole, string>
const ROLE_HELP: Record<TenantRole, string> = {
  admin: 'can manage the website, community, inbox, newsletters and the team',
  editor: 'can manage the website, community, inbox and newsletters',
  contributor: 'can write drafts for the website',
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const fail = (error: string, status: number) => Response.json({ error }, { status })
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

type Inviter = Parameters<typeof isPlatformAdmin>[0] & { name?: string; email?: string }

/** Legislators the user may invite people to: all for platform admins, otherwise those they are a team admin of. */
async function invitableTenants(req: PayloadRequest) {
  const user = req.user as Inviter | null
  if (!user) return []
  const managed = tenantIdsFor(user, ['admin'])
  if (!isPlatformAdmin(user) && !managed.length) return []
  const where: Where = isPlatformAdmin(user) ? {} : { id: { in: managed } }
  const r = await req.payload.find({ collection: 'tenants', where, sort: 'name', limit: 500, depth: 0, overrideAccess: true })
  return r.docs.map((t) => ({ id: Number(t.id), name: t.name }))
}

/** A one-time link to choose a password, valid for INVITE_DAYS (Payload's reset-password screen). */
async function inviteLink(req: PayloadRequest, email: string) {
  const token = await req.payload.forgotPassword({
    collection: 'users',
    data: { email },
    disableEmail: true,
    expiration: INVITE_DAYS * 86_400_000,
    overrideAccess: true,
  })
  return `${getPortalUrl()}/admin/reset/${token}`
}

async function sendInviteEmail(req: PayloadRequest, opts: { to: string; name: string; inviter: string; office: string; role: TenantRole; link: string; existing: boolean }) {
  const first = opts.name.split(' ')[0] || opts.name
  const action = opts.existing ? 'Log in to the Civiq Portal' : 'Choose your password'
  const lead = opts.existing
    ? `${opts.inviter} has added you to the team for <b>${esc(opts.office)}</b> on the Civiq Portal, as ${ROLE_LABEL[opts.role]}.`
    : `${opts.inviter} has invited you to join the team for <b>${esc(opts.office)}</b> on the Civiq Portal, as ${ROLE_LABEL[opts.role]}.`
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b2620;max-width:560px">
<p style="margin:0 0 14px">Hello ${esc(first)},</p>
<p style="margin:0 0 14px">${lead} As ${ROLE_LABEL[opts.role].toLowerCase()} you ${ROLE_HELP[opts.role]}.</p>
<p style="margin:22px 0"><a href="${esc(opts.link)}" style="background:#0b5d3b;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;display:inline-block">${action}</a></p>
${opts.existing ? '' : `<p style="margin:0 0 14px;color:#5b665f;font-size:13px">The link works once and expires in ${INVITE_DAYS} days. Your login is this email address, ${esc(opts.to)}.</p>`}
<p style="margin:0;color:#5b665f;font-size:13px">If you were not expecting this, you can ignore this email.</p>
</div>`
  const text = `Hello ${first},\n\n${lead.replace(/<\/?b>/g, '')} As ${ROLE_LABEL[opts.role].toLowerCase()} you ${ROLE_HELP[opts.role]}.\n\n${action}: ${opts.link}\n${opts.existing ? '' : `\nThe link works once and expires in ${INVITE_DAYS} days. Your login is ${opts.to}.\n`}`
  await req.payload.sendEmail({ to: opts.to, subject: opts.existing ? `You've been added to ${opts.office}'s team on Civiq` : `You're invited to ${opts.office}'s team on Civiq`, html, text })
}

const delivered = () => Boolean(process.env.RESEND_API_KEY)

/** GET /api/users/invite-options — who the user can invite people to, and with which roles. */
export const inviteOptionsEndpoint: Endpoint = {
  path: '/invite-options',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return fail('Please log in again.', 401)
    return Response.json({ tenants: await invitableTenants(req), roles: TENANT_ROLES.map((r) => ({ ...r, help: ROLE_HELP[r.value] })) })
  },
}

/**
 * POST /api/users/invite  { name, email, tenant, role }
 * New people get an account with a random password and an emailed link to choose their own.
 * People who already have an account are added to the team and told by email.
 */
export const inviteEndpoint: Endpoint = {
  path: '/invite',
  method: 'post',
  handler: async (req) => {
    const user = req.user as Inviter | null
    if (!user) return fail('Please log in again.', 401)
    const input = (await req.json?.().catch(() => ({}))) as { name?: string; email?: string; tenant?: number | string; role?: string }
    const name = String(input.name ?? '').trim().slice(0, 100)
    const email = String(input.email ?? '').trim().toLowerCase()
    const role = String(input.role ?? '') as TenantRole
    const tenantId = Number(input.tenant)
    if (!name) return fail('Enter their name.', 400)
    if (!validEmail(email)) return fail('Enter a valid email address.', 400)
    if (!ROLE_LABEL[role]) return fail('Choose a role.', 400)
    const tenant = (await invitableTenants(req)).find((t) => t.id === tenantId)
    if (!tenant) return fail('You can only invite people to teams you are an admin of.', 403)

    const inviterName = user.name || user.email || 'The Civiq team'
    const existing = (await req.payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    let link: string
    let target: User
    if (existing) {
      if (roleIn(existing, tenantId)) return fail(`${existing.name} is already on this team.`, 409)
      target = await req.payload.update({
        collection: 'users',
        id: existing.id,
        data: { tenants: [...(existing.tenants ?? []).map((r) => ({ tenant: Number(idOf(r.tenant)), role: r.role })), { tenant: tenantId, role }] },
        overrideAccess: true,
      })
      link = `${getPortalUrl()}/admin`
    } else {
      target = await req.payload.create({
        collection: 'users',
        data: {
          name,
          email,
          password: crypto.randomBytes(24).toString('base64url'), // never shown; they choose their own
          platformRole: 'member',
          tenants: [{ tenant: tenantId, role }],
          invitedAt: new Date().toISOString(),
          invitedByName: inviterName,
        },
        overrideAccess: true,
      })
      link = await inviteLink(req, email)
    }

    try {
      await sendInviteEmail(req, { to: email, name: target.name, inviter: inviterName, office: tenant.name, role, link, existing: Boolean(existing) })
    } catch (err) {
      req.payload.logger.error({ err }, 'Invite email failed to send')
      return Response.json({ ok: true, emailed: false, existing: Boolean(existing), inviteUrl: existing ? null : link, user: { id: target.id, name: target.name } })
    }
    // The link is also given to the inviter so it can be shared another way (e.g. WhatsApp) if the email is slow.
    return Response.json({ ok: true, emailed: delivered(), existing: Boolean(existing), inviteUrl: existing ? null : link, user: { id: target.id, name: target.name } })
  },
}

/**
 * POST /api/users/:id/resend-invite — a fresh link for someone who has not joined yet.
 * Only for accounts that have never been used, and only by someone who manages every team they are on,
 * so a team admin can never take over an account that belongs to another legislator's team.
 */
export const resendInviteEndpoint: Endpoint = {
  path: '/:id/resend-invite',
  method: 'post',
  handler: async (req) => {
    const user = req.user as Inviter | null
    if (!user) return fail('Please log in again.', 401)
    const target = await req.payload.findByID({ collection: 'users', id: String(req.routeParams?.id ?? ''), depth: 0, overrideAccess: true }).catch(() => null)
    if (!target) return fail('User not found.', 404)
    if (target.lastSeenAt) return fail(`${target.name} has already joined. They can use “Forgot password” on the login page.`, 409)
    const managed = tenantIdsFor(user, ['admin']).map(String)
    const teams = (target.tenants ?? []).map((r) => String(idOf(r.tenant)))
    const allowed = isPlatformAdmin(user) || (target.platformRole !== 'platform-admin' && teams.length > 0 && teams.every((t) => managed.includes(t)))
    if (!allowed) return fail('Only an admin of their team can resend the invite.', 403)

    const firstTeam = target.tenants?.[0]
    const tenant = firstTeam ? await req.payload.findByID({ collection: 'tenants', id: Number(idOf(firstTeam.tenant)), depth: 0, overrideAccess: true }) : null
    const link = await inviteLink(req, target.email)
    const inviterName = user.name || user.email || 'The Civiq team'
    await req.payload.update({ collection: 'users', id: target.id, data: { invitedAt: new Date().toISOString(), invitedByName: inviterName }, overrideAccess: true })
    try {
      await sendInviteEmail(req, { to: target.email, name: target.name, inviter: inviterName, office: tenant?.name ?? 'Civiq', role: (firstTeam?.role as TenantRole) ?? 'editor', link, existing: false })
    } catch (err) {
      req.payload.logger.error({ err }, 'Invite email failed to send')
      return Response.json({ ok: true, emailed: false, inviteUrl: link })
    }
    return Response.json({ ok: true, emailed: delivered(), inviteUrl: link })
  },
}

/** Records when someone last used the portal (at most every 15 minutes), so teams can see who is active. */
// During login, `req` carries the login's database transaction, which holds the user's row; writing
// through the same req avoids waiting on that lock.
export async function touchLastSeen(req: Pick<PayloadRequest, 'payload'> & Partial<PayloadRequest>, user: { id: number | string; lastSeenAt?: string | null }) {
  if (user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() < 15 * 60_000) return
  await req.payload.db
    .updateOne({ collection: 'users', id: user.id, data: { lastSeenAt: new Date().toISOString() }, req: 'transactionID' in req ? req : undefined })
    .catch((err: unknown) => req.payload.logger.warn({ err }, 'Could not record last seen'))
}
