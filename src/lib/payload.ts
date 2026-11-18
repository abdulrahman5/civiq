import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload, type PayloadRequest } from 'payload'
import { cache } from 'react'

import type { Media } from '@/payload-types'

export const getClient = cache(() => getPayload({ config }))

type TenantID = number

/**
 * Runs public-website database work for ONE legislator, as the restricted database role
 * `civiq_web`, inside a transaction tagged with that tenant. Postgres row-level security then
 * refuses rows belonging to any other legislator, even if a query forgets its tenant filter.
 * The console keeps using the normal role and is protected by access control.
 */
export const asSite = async <T>(tenant: TenantID, fn: (req: Partial<PayloadRequest>) => Promise<T>): Promise<T> => {
  const payload = await getClient()
  const db = payload.db as unknown as PostgresAdapter
  const id = await db.beginTransaction()
  if (id === null) throw new Error('Database transactions are disabled; the public site requires them.')
  try {
    const tx = db.sessions[id]!.db
    await tx.execute(sql`SET LOCAL ROLE civiq_web`)
    await tx.execute(sql`SELECT set_config('civiq.tenant_id', ${String(tenant)}, true)`)
    const result = await fn({ transactionID: id })
    await db.commitTransaction(id)
    return result
  } catch (err) {
    await db.rollbackTransaction(id)
    throw err
  }
}

// Public queries run with the visitor's (anonymous) permissions, so drafts are never shown,
// and every query is filtered to one legislator's site, both here and by the database itself.
const one = async <S extends 'site-settings' | 'about' | 'agenda'>(collection: S, tenant: TenantID, depth: number) =>
  asSite(tenant, async (req) =>
    (await getClient())
      .find({ collection, where: { tenant: { equals: tenant } }, limit: 1, depth, overrideAccess: false, req })
      .then((r) => r.docs[0] ?? null),
  )

export const getSettings = cache(async (tenant: TenantID) => one('site-settings', tenant, 1))
export const getAbout = cache(async (tenant: TenantID) => one('about', tenant, 1))
export const getAgenda = cache(async (tenant: TenantID) => one('agenda', tenant, 0))

export const getProjects = cache(async (tenant: TenantID) =>
  asSite(tenant, async (req) =>
    (await getClient())
      .find({ collection: 'projects', where: { tenant: { equals: tenant } }, depth: 1, sort: 'order', pagination: false, overrideAccess: false, req })
      .then((r) => r.docs),
  ),
)

export const getNews = cache(async (tenant: TenantID, limit?: number) =>
  asSite(tenant, async (req) =>
    (await getClient())
      .find({
        collection: 'news',
        where: { tenant: { equals: tenant } },
        depth: 1,
        sort: '-publishedDate',
        limit: limit ?? 0,
        pagination: Boolean(limit),
        overrideAccess: false,
        req,
      })
      .then((r) => r.docs),
  ),
)

export const getPost = cache(async (tenant: TenantID, slug: string) =>
  asSite(tenant, async (req) =>
    (await getClient())
      .find({ collection: 'news', where: { and: [{ tenant: { equals: tenant } }, { slug: { equals: slug } }] }, depth: 1, limit: 1, overrideAccess: false, req })
      .then((r) => r.docs[0] ?? null),
  ),
)

// ---------- presentation helpers ----------

/** Text in [square brackets] is placeholder copy that still needs to be filled in. */
export const isPlaceholder = (s?: string | null) => Boolean(s && /^\s*\[.*\]\s*$/s.test(s))
export const ph = (s?: string | null) => (isPlaceholder(s) ? 'placeholder' : undefined)

export const asMedia = (m: unknown): Media | null => (m && typeof m === 'object' && 'url' in m ? (m as Media) : null)

export const imageUrl = (m: unknown, size?: 'thumbnail' | 'card' | 'large') => {
  const media = asMedia(m)
  if (!media) return null
  return (size && media.sizes?.[size]?.url) || media.url || null
}

export const absoluteUrl = (base: string, u?: string | null) => (!u ? undefined : u.startsWith('http') ? u : base + u)

export const hex = (v: string | null | undefined, fallback: string) => (v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback)

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }) : ''

export const initials = (name: string) =>
  name
    .replace(/^(hon|sen|rt\.? hon|dr|mrs?|ms)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('')
