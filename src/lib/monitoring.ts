import { sql } from '@payloadcms/db-postgres'
import crypto from 'node:crypto'
import type { Endpoint, Payload } from 'payload'

import { isPlatformAdmin } from '../access'
import type { Tenant } from '@/payload-types'
import { getAdminUrl } from './apps'
import { countPlaceholders, newsTotals, run } from './insights'
import { isPlaceholder } from './placeholder'
import { getPortalUrl, getRootDomain } from './site-url'
import { civiqInbox } from './support'
import { themeOf } from './themes'

const TIMEOUT_MS = 10_000
const KEEP_DAYS = 30
const DAY = 86_400_000
const int = (v: unknown) => Number(v ?? 0)
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** The address checked for a site: its main domain, else its preview address. */
export function siteUrl(t: Pick<Tenant, 'primaryDomain' | 'slug'>) {
  const host = t.primaryDomain || (getRootDomain() ? `${t.slug}.${getRootDomain()}` : null)
  if (!host) return null
  // MONITOR_URL_TEMPLATE is only for local testing (e.g. http://{host}:4200); production checks https.
  return (process.env.MONITOR_URL_TEMPLATE || 'https://{host}').replace('{host}', host)
}

export type CheckResult = { url: string; ok: boolean; statusCode: number | null; responseMs: number | null; error: string | null }

/** Loads the site's home page like a visitor would. Up = a 2xx page that is not the "Site not found" page. */
export async function checkUrl(url: string): Promise<CheckResult> {
  const started = Date.now()
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'CiviqMonitor/1.0 (+https://theciviq.com.ng)' }, cache: 'no-store' })
    const body = await r.text()
    const responseMs = Date.now() - started
    if (!r.ok) return { url, ok: false, statusCode: r.status, responseMs, error: `HTTP ${r.status}` }
    if (body.includes('Site not found')) return { url, ok: false, statusCode: r.status, responseMs, error: 'Shows “Site not found”: domain not linked to this site' }
    return { url, ok: true, statusCode: r.status, responseMs, error: null }
  } catch (err) {
    const e = err as Error & { cause?: { code?: string } }
    const reason = e.name === 'TimeoutError' ? `No response within ${TIMEOUT_MS / 1000} s` : e.cause?.code === 'ENOTFOUND' ? 'Domain does not resolve (DNS)' : (e.cause?.code ?? e.message ?? 'Unreachable')
    return { url, ok: false, statusCode: null, responseMs: null, error: String(reason).slice(0, 200) }
  }
}

async function alert(payload: Payload, t: Tenant, now: CheckResult, recovered: boolean) {
  const to = await civiqInbox(payload)
  if (!to) return
  const link = `${getAdminUrl() ?? getPortalUrl()}/admin/monitoring`
  const subject = recovered ? `[Civiq monitor] RECOVERED: ${t.name}'s site is back up` : `[Civiq monitor] DOWN: ${t.name}'s site is not loading`
  const detail = recovered ? `${now.url} is loading again (${now.responseMs} ms).` : `${now.url} could not be loaded: ${now.error ?? 'unknown error'}.`
  await payload
    .sendEmail({
      to,
      subject,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1b2620"><p>${esc(detail)}</p><p><a href="${esc(link)}">Open Site health in the Civiq Admin</a></p></div>`,
    })
    .catch((err: unknown) => payload.logger.error({ err }, 'Monitoring alert email failed'))
}

/**
 * Checks every active site (5 at a time), saves the results, emails the Civiq team when a live site goes
 * down or comes back, and drops results older than 30 days.
 */
export async function runChecks(payload: Payload) {
  const tenants = (await payload.find({ collection: 'tenants', where: { status: { equals: 'active' } }, limit: 500, depth: 0, overrideAccess: true })).docs
  const results: { id: number; name: string; ok: boolean; error: string | null }[] = []
  for (let i = 0; i < tenants.length; i += 5) {
    await Promise.all(
      tenants.slice(i, i + 5).map(async (t) => {
        const url = siteUrl(t)
        if (!url) return
        const prev = (await payload.find({ collection: 'site-checks', where: { site: { equals: t.id } }, sort: '-createdAt', limit: 1, depth: 0, overrideAccess: true })).docs[0]
        const now = await checkUrl(url)
        await payload.create({ collection: 'site-checks', data: { site: t.id, ...now, statusCode: now.statusCode ?? undefined, responseMs: now.responseMs ?? undefined, error: now.error ?? undefined }, overrideAccess: true })
        // Alerts only for live sites (a main domain); a preview address being down is not an emergency.
        if (t.primaryDomain && (prev ? prev.ok !== now.ok : !now.ok)) await alert(payload, t, now, now.ok)
        results.push({ id: Number(t.id), name: t.name, ok: now.ok, error: now.error })
      }),
    )
  }
  await payload.delete({ collection: 'site-checks', where: { createdAt: { less_than: new Date(Date.now() - KEEP_DAYS * DAY).toISOString() } }, overrideAccess: true })
  return { checked: results.length, down: results.filter((r) => !r.ok).length, results }
}

// ---- Health: everything the Civiq team needs to know about each site, with plain reasons ----
export type Reason = { level: 'critical' | 'warning'; text: string }
export type SiteHealth = {
  id: number
  name: string
  chamber: string
  status: 'down' | 'attention' | 'healthy' | 'suspended' | 'unchecked'
  domain: string | null
  url: string | null
  lastCheck: { ok: boolean; at: string; responseMs: number | null; error: string | null } | null
  uptime7d: number | null // percent
  supporters: number
  new7: number
  unread: number
  oldestUnreadDays: number | null
  daysSinceNews: number | null
  lastTeamActivityDays: number | null
  openSupport: number
  urgentSupport: number
  reasons: Reason[]
}

const daysAgo = (iso: unknown) => (iso ? Math.floor((Date.now() - new Date(String(iso)).getTime()) / DAY) : null)

export async function siteHealth(payload: Payload): Promise<SiteHealth[]> {
  const tenants = (await payload.find({ collection: 'tenants', limit: 500, depth: 0, sort: 'name', overrideAccess: true })).docs
  const rows = await Promise.all(
    tenants.map(async (t): Promise<SiteHealth> => {
      const id = Number(t.id)
      const [checks, placeholders, news, settings, [agg]] = await Promise.all([
        payload.find({ collection: 'site-checks', where: { and: [{ site: { equals: id } }, { createdAt: { greater_than: new Date(Date.now() - 7 * DAY).toISOString() } }] }, sort: '-createdAt', limit: 1000, depth: 0, overrideAccess: true }),
        countPlaceholders(payload, id),
        newsTotals(payload, id),
        payload.find({ collection: 'site-settings', where: { tenant: { equals: id } }, limit: 1, depth: 0, overrideAccess: true }).then((r) => r.docs[0]),
        run<Record<string, unknown>>(
          payload,
          sql`SELECT
                (SELECT count(*) FROM supporters s WHERE s.tenant_id = ${id} AND s.status = 'subscribed') AS supporters,
                (SELECT count(*) FROM supporters s WHERE s.tenant_id = ${id} AND s.created_at >= now() - interval '7 days') AS new7,
                (SELECT count(*) FROM messages m WHERE m.tenant_id = ${id} AND m.status = 'unread') AS unread,
                (SELECT min(m.created_at) FROM messages m WHERE m.tenant_id = ${id} AND m.status = 'unread') AS oldest_unread,
                (SELECT max(u.last_seen_at) FROM users u JOIN users_tenants ut ON ut._parent_id = u.id WHERE ut.tenant_id = ${id} AND u.platform_role <> 'platform-admin') AS last_team_seen,
                (SELECT count(*) FROM users_tenants ut JOIN users u ON u.id = ut._parent_id WHERE ut.tenant_id = ${id} AND ut.role = 'admin' AND u.platform_role <> 'platform-admin') AS team_admins,
                (SELECT count(*) FROM support_requests r WHERE r.tenant_id = ${id} AND r.status <> 'resolved') AS open_support,
                (SELECT count(*) FROM support_requests r WHERE r.tenant_id = ${id} AND r.status <> 'resolved' AND r.priority = 'urgent') AS urgent_support`,
        ),
      ])
      const last = checks.docs[0]
      const uptime7d = checks.docs.length ? Math.round((checks.docs.filter((c) => c.ok).length / checks.docs.length) * 1000) / 10 : null
      const reasons: Reason[] = []
      const officeEmail = settings?.contact?.email && !isPlaceholder(settings.contact.email)
      const officeAddress = settings?.contact?.address && !isPlaceholder(settings.contact.address)
      const daysSinceNews = news.lastPublished ? daysAgo(news.lastPublished) : null
      const oldestUnreadDays = daysAgo(agg?.oldest_unread)
      const lastTeamActivityDays = daysAgo(agg?.last_team_seen)

      if (last && !last.ok) reasons.push({ level: t.primaryDomain ? 'critical' : 'warning', text: `${t.primaryDomain ? 'Site' : 'Preview address'} not loading: ${last.error ?? 'error'}` })
      if (!last && t.status === 'active') reasons.push({ level: 'warning', text: 'Not checked yet' })
      if (int(agg?.urgent_support)) reasons.push({ level: 'critical', text: `${int(agg?.urgent_support)} urgent support request${int(agg?.urgent_support) === 1 ? '' : 's'} open` })
      if (!t.primaryDomain) reasons.push({ level: 'warning', text: 'No main domain yet' })
      if (placeholders) reasons.push({ level: 'warning', text: `${placeholders} placeholder text${placeholders === 1 ? '' : 's'} still on the site` })
      if (!officeEmail || !officeAddress) reasons.push({ level: 'warning', text: 'Office email or address missing (replies and newsletters blocked)' })
      if (daysSinceNews === null) reasons.push({ level: 'warning', text: 'No news published yet' })
      else if (daysSinceNews > 30) reasons.push({ level: 'warning', text: `No news in ${daysSinceNews} days` })
      if (oldestUnreadDays !== null && oldestUnreadDays > 7) reasons.push({ level: 'warning', text: `Unread messages waiting ${oldestUnreadDays} days` })
      if (!int(agg?.team_admins)) reasons.push({ level: 'warning', text: 'No team admin on this site' })
      else if (lastTeamActivityDays === null) reasons.push({ level: 'warning', text: 'The team has never logged in' })
      else if (lastTeamActivityDays > 14) reasons.push({ level: 'warning', text: `No team activity in ${lastTeamActivityDays} days` })

      const status: SiteHealth['status'] =
        t.status !== 'active' ? 'suspended' : last && !last.ok && t.primaryDomain ? 'down' : !last ? 'unchecked' : reasons.length ? 'attention' : 'healthy'
      return {
        id,
        name: t.name,
        chamber: themeOf(t).label,
        status,
        domain: t.primaryDomain ?? null,
        url: siteUrl(t),
        lastCheck: last ? { ok: Boolean(last.ok), at: last.createdAt, responseMs: last.responseMs ?? null, error: last.error ?? null } : null,
        uptime7d,
        supporters: int(agg?.supporters),
        new7: int(agg?.new7),
        unread: int(agg?.unread),
        oldestUnreadDays,
        daysSinceNews,
        lastTeamActivityDays,
        openSupport: int(agg?.open_support),
        urgentSupport: int(agg?.urgent_support),
        reasons: t.status === 'active' ? reasons.sort((a, b) => Number(b.level === 'critical') - Number(a.level === 'critical')) : [],
      }
    }),
  )
  const order = { down: 0, attention: 1, unchecked: 2, healthy: 3, suspended: 4 }
  return rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name))
}

/** POST /api/site-checks/run — "Check now" in Site health (Civiq team only). */
export const runChecksEndpoint: Endpoint = {
  path: '/run',
  method: 'post',
  handler: async (req) => {
    if (!isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0])) return Response.json({ error: 'Not allowed.' }, { status: 403 })
    return Response.json({ ok: true, ...(await runChecks(req.payload)) })
  },
}

/** GET /api/site-checks/cron — scheduled checks (Vercel Cron, Authorization: Bearer CRON_SECRET). */
export const monitoringCronEndpoint: Endpoint = {
  path: '/cron',
  method: 'get',
  handler: async (req) => {
    const secret = process.env.CRON_SECRET
    const given = req.headers.get('authorization') ?? ''
    const expected = `Bearer ${secret}`
    if (!secret || given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      return Response.json({ error: 'Unauthorised.' }, { status: 401 })
    }
    return Response.json({ ok: true, ...(await runChecks(req.payload)) })
  },
}
