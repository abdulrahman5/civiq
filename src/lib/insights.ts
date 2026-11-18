import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

// Aggregates for the Civiq Portal (Home and Community). These run as the portal's normal database
// role, so EVERY query filters by tenant explicitly. Only call them with a tenant the signed-in user
// is allowed to see (see getPortalContext in src/components/portal/context.ts).

type TenantID = number
export type Row = { label: string; n: number }

const run = async <T>(payload: Payload, query: ReturnType<typeof sql>) =>
  ((await (payload.db as unknown as PostgresAdapter).drizzle.execute(query)).rows ?? []) as T[]

const int = (v: unknown) => Number(v ?? 0)

export async function supporterTotals(payload: Payload, tenant: TenantID) {
  const [r] = await run<Record<string, unknown>>(
    payload,
    sql`SELECT
          count(*) FILTER (WHERE status = 'subscribed')                                             AS subscribed,
          count(*) FILTER (WHERE status = 'unsubscribed')                                           AS unsubscribed,
          count(*) FILTER (WHERE status = 'subscribed' AND coalesce(email, '') <> '')                AS with_email,
          count(*) FILTER (WHERE created_at >= now() - interval '7 days')                           AS new7,
          count(*) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS prev7
        FROM supporters WHERE tenant_id = ${tenant}`,
  )
  return {
    subscribed: int(r?.subscribed),
    unsubscribed: int(r?.unsubscribed),
    withEmail: int(r?.with_email),
    new7: int(r?.new7),
    prev7: int(r?.prev7),
  }
}

/** New supporters per week (Lagos time) for the last `weeks` weeks, oldest first, including empty weeks. */
export async function weeklySignups(payload: Payload, tenant: TenantID, weeks = 12) {
  const rows = await run<{ week: string; n: unknown }>(
    payload,
    sql`WITH w AS (
          SELECT generate_series(
            date_trunc('week', now() AT TIME ZONE 'Africa/Lagos') - make_interval(weeks => ${weeks - 1}),
            date_trunc('week', now() AT TIME ZONE 'Africa/Lagos'),
            interval '1 week') AS wk)
        SELECT to_char(w.wk, 'YYYY-MM-DD') AS week, count(s.id) AS n
        FROM w LEFT JOIN supporters s
          ON s.tenant_id = ${tenant} AND date_trunc('week', s.created_at AT TIME ZONE 'Africa/Lagos') = w.wk
        GROUP BY w.wk ORDER BY w.wk`,
  )
  return rows.map((r) => ({ week: r.week, n: int(r.n) }))
}

const PLACE_COLUMNS = { ward: 'ward', lga: 'lga', state: 'state' } as const

/** Subscribed supporters by ward / LGA / state, tidied so "bida central" and "Bida Central" count together. */
export async function topPlaces(payload: Payload, tenant: TenantID, column: keyof typeof PLACE_COLUMNS, limit = 8) {
  const col = sql.raw(`"${PLACE_COLUMNS[column]}"`)
  const rows = await run<{ label: string; n: unknown }>(
    payload,
    sql`SELECT initcap(lower(regexp_replace(trim(${col}), '\\s+', ' ', 'g'))) AS label, count(*) AS n
        FROM supporters
        WHERE tenant_id = ${tenant} AND status = 'subscribed' AND coalesce(trim(${col}), '') <> ''
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`,
  )
  return rows.map((r) => ({ label: r.label, n: int(r.n) }))
}

const MULTI_TABLES = { interests: 'supporters_interests', channels: 'supporters_channels' } as const

/** Subscribed supporters by interest or preferred contact channel (a person can pick several). */
export async function multiBreakdown(payload: Payload, tenant: TenantID, field: keyof typeof MULTI_TABLES) {
  const table = sql.raw(`"${MULTI_TABLES[field]}"`)
  const rows = await run<{ label: string; n: unknown }>(
    payload,
    sql`SELECT x.value::text AS label, count(DISTINCT s.id) AS n
        FROM ${table} x JOIN supporters s ON s.id = x.parent_id
        WHERE s.tenant_id = ${tenant} AND s.status = 'subscribed'
        GROUP BY 1 ORDER BY 2 DESC, 1`,
  )
  return rows.map((r) => ({ label: r.label, n: int(r.n) }))
}

export async function messageTotals(payload: Payload, tenant: TenantID) {
  const [r] = await run<Record<string, unknown>>(
    payload,
    sql`SELECT count(*) FILTER (WHERE status = 'unread') AS unread,
               count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS week
        FROM messages WHERE tenant_id = ${tenant}`,
  )
  return { unread: int(r?.unread), week: int(r?.week) }
}

export async function newsTotals(payload: Payload, tenant: TenantID) {
  const [r] = await run<Record<string, unknown>>(
    payload,
    sql`SELECT count(*) FILTER (WHERE _status = 'published') AS published,
               count(*) FILTER (WHERE _status = 'draft') AS drafts,
               max(published_date) FILTER (WHERE _status = 'published') AS last_published
        FROM news WHERE tenant_id = ${tenant}`,
  )
  return { published: int(r?.published), drafts: int(r?.drafts), lastPublished: (r?.last_published as string | null) ?? null }
}

/** Every legislator site with headline numbers, for Civiq platform admins. */
export async function platformOverview(payload: Payload) {
  const rows = await run<Record<string, unknown>>(
    payload,
    sql`SELECT t.id, t.name, t.slug, t.primary_domain, t.status,
          (SELECT count(*) FROM supporters s WHERE s.tenant_id = t.id AND s.status = 'subscribed') AS supporters,
          (SELECT count(*) FROM supporters s WHERE s.tenant_id = t.id AND s.created_at >= now() - interval '7 days') AS new7,
          (SELECT count(*) FROM messages m WHERE m.tenant_id = t.id AND m.status = 'unread') AS unread
        FROM tenants t ORDER BY t.name`,
  )
  return rows.map((r) => ({
    id: int(r.id),
    name: String(r.name),
    slug: String(r.slug),
    domain: (r.primary_domain as string | null) ?? null,
    status: String(r.status),
    supporters: int(r.supporters),
    new7: int(r.new7),
    unread: int(r.unread),
  }))
}

export type AudienceFilters = {
  wards?: string[] | null
  lgas?: string[] | null
  states?: string[] | null
  interests?: string[] | null
  channels?: string[] | null
  requireEmail?: boolean | null
}

// Drizzle expands JS arrays into separate parameters, so build a real Postgres text[] explicitly.
const textArray = (values: string[]) => sql`ARRAY[${sql.join(values.map((v) => sql`${v}`), sql`, `)}]::text[]`

const lowered = (xs?: string[] | null) => (xs ?? []).map((x) => x.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean)

/** How many subscribed supporters match a saved audience. Matching on places ignores case and spacing. */
export async function countAudience(payload: Payload, tenant: TenantID, f: AudienceFilters) {
  const wards = lowered(f.wards)
  const lgas = lowered(f.lgas)
  const states = lowered(f.states)
  const interests = f.interests ?? []
  const channels = f.channels ?? []
  const place = (col: string, values: string[]) =>
    values.length ? sql`AND lower(regexp_replace(trim(${sql.raw(`s."${col}"`)}), '\\s+', ' ', 'g')) = ANY(${textArray(values)})` : sql``
  const [r] = await run<{ n: unknown }>(
    payload,
    sql`SELECT count(*) AS n FROM supporters s
        WHERE s.tenant_id = ${tenant} AND s.status = 'subscribed'
        ${place('ward', wards)} ${place('lga', lgas)} ${place('state', states)}
        ${interests.length ? sql`AND EXISTS (SELECT 1 FROM supporters_interests i WHERE i.parent_id = s.id AND i.value::text = ANY(${textArray(interests)}))` : sql``}
        ${channels.length ? sql`AND EXISTS (SELECT 1 FROM supporters_channels c WHERE c.parent_id = s.id AND c.value::text = ANY(${textArray(channels)}))` : sql``}
        ${f.requireEmail ? sql`AND coalesce(s.email, '') <> ''` : sql``}`,
  )
  return int(r?.n)
}

/** Inbox tab counts for one legislator. */
export async function inboxCounts(payload: Payload, tenant: TenantID) {
  const [r] = await run<Record<string, unknown>>(
    payload,
    sql`SELECT count(*) FILTER (WHERE status = 'unread') AS unread,
               count(*) FILTER (WHERE status = 'read') AS read,
               count(*) FILTER (WHERE status = 'archived') AS archived,
               count(*) AS all
        FROM messages WHERE tenant_id = ${tenant}`,
  )
  return { unread: int(r?.unread), read: int(r?.read), archived: int(r?.archived), all: int(r?.all) }
}
