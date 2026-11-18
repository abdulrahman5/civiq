import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { Newsletter } from '@/payload-types'
import { idOf } from '../../access'
import { audienceWhere, run } from '../insights'
import { fromAddress, getBranding, newsletterContent, renderEmail, tenantOf, unsubscribeUrl } from './render'

const BATCH = 100 // Resend's batch API maximum
const int = (v: unknown) => Number(v ?? 0)
const intArray = (xs: number[]) => sql`ARRAY[${sql.join(xs.map((x) => sql`${x}`), sql`, `)}]::int[]`
const textArray = (xs: string[]) => sql`ARRAY[${sql.join(xs.map((x) => sql`${x}`), sql`, `)}]::text[]`

/** Real sending needs a Resend key; NEWSLETTER_DRY_RUN=1 records everything without emailing (testing only). */
export const sendingMode = () => (process.env.NEWSLETTER_DRY_RUN === '1' ? 'dry-run' : process.env.RESEND_API_KEY ? 'live' : 'off')

type OutgoingEmail = { from: string; to: string[]; reply_to?: string; subject: string; html: string; text: string; headers?: Record<string, string>; tags?: { name: string; value: string }[] }

/** Sends up to 100 emails in one Resend call. Returns Resend's email ids, in order. */
export async function sendBatch(payload: Payload, emails: OutgoingEmail[]): Promise<string[]> {
  if (sendingMode() === 'dry-run') {
    payload.logger.info(`[newsletter dry run] would send ${emails.length} email(s): ${emails.map((e) => e.to[0]).join(', ')}`)
    return emails.map((_, i) => `dry-run-${Date.now()}-${i}`)
  }
  const r = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emails),
    signal: AbortSignal.timeout(30000),
  })
  const json = (await r.json().catch(() => ({}))) as { data?: { id: string }[]; message?: string; name?: string }
  if (!r.ok || !Array.isArray(json.data)) throw new Error(json.message || json.name || `Resend returned HTTP ${r.status}`)
  return json.data.map((d) => d.id)
}

/** Creates one queued delivery per matching supporter with an email (one per address). Returns the count. */
export async function queueRecipients(payload: Payload, n: Newsletter) {
  const tenant = tenantOf(n)
  const audienceId = idOf(n.audience)
  const audience = audienceId ? await payload.findByID({ collection: 'audiences', id: audienceId, depth: 0, overrideAccess: true }) : {}
  await run(
    payload,
    sql`INSERT INTO newsletter_deliveries (tenant_id, newsletter_id, supporter_id, email, status, created_at, updated_at)
        SELECT DISTINCT ON (lower(s.email)) s.tenant_id, ${Number(n.id)}, s.id, s.email, 'queued', now(), now()
        FROM supporters s
        WHERE ${audienceWhere(tenant, { ...audience, requireEmail: true })}
        ORDER BY lower(s.email), s.id
        ON CONFLICT DO NOTHING`, // the unique index keeps one email per address per newsletter, even if Send is pressed twice
  )
  return (await newsletterStats(payload, Number(n.id))).total
}

export async function newsletterStats(payload: Payload, newsletterId: number) {
  const [r] = await run<Record<string, unknown>>(
    payload,
    sql`SELECT count(*) AS total,
               count(*) FILTER (WHERE status IN ('queued', 'claimed')) AS pending,
               count(*) FILTER (WHERE resend_id IS NOT NULL) AS sent,
               count(*) FILTER (WHERE status = 'failed') AS failed,
               count(delivered_at) AS delivered,
               count(opened_at) AS opened,
               count(clicked_at) AS clicked,
               count(*) FILTER (WHERE status = 'bounced') AS bounced,
               count(*) FILTER (WHERE status = 'complained') AS complained
        FROM newsletter_deliveries WHERE newsletter_id = ${newsletterId}`,
  )
  const keys = ['total', 'pending', 'sent', 'failed', 'delivered', 'opened', 'clicked', 'bounced', 'complained'] as const
  return Object.fromEntries(keys.map((k) => [k, int(r?.[k])])) as Record<(typeof keys)[number], number>
}

/**
 * Sends queued emails for one newsletter until the queue is empty or `deadline` (ms timestamp) passes.
 * Each batch is claimed atomically first (FOR UPDATE SKIP LOCKED), so overlapping runs never send the
 * same email twice. Batches interrupted mid-send are marked failed, not retried, for the same reason.
 */
export async function processNewsletter(payload: Payload, newsletterId: number, deadline: number) {
  const n = await payload.findByID({ collection: 'newsletters', id: newsletterId, depth: 1, overrideAccess: true })
  if (n.status !== 'sending') return newsletterStats(payload, newsletterId)

  await run(
    payload,
    sql`UPDATE newsletter_deliveries SET status = 'failed', error = 'Interrupted while sending; not retried to avoid duplicates', updated_at = now()
        WHERE newsletter_id = ${newsletterId} AND status = 'claimed' AND updated_at < now() - interval '15 minutes'`,
  )

  const branding = await getBranding(payload, tenantOf(n))
  const content = newsletterContent(n, branding.brand)
  const from = fromAddress(branding)

  while (Date.now() < deadline) {
    const claimed = await run<{ id: unknown; supporter_id: unknown; email: string }>(
      payload,
      sql`UPDATE newsletter_deliveries SET status = 'claimed', updated_at = now()
          WHERE id IN (SELECT id FROM newsletter_deliveries WHERE newsletter_id = ${newsletterId} AND status = 'queued'
                       ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED)
          RETURNING id, supporter_id, email`,
    )
    if (!claimed.length) break
    const ids = claimed.map((c) => int(c.id))
    try {
      const emails = claimed.map((c) => {
        const unsubscribe = unsubscribeUrl(int(c.supporter_id))
        const { html, text } = renderEmail(n, branding, content, unsubscribe)
        return {
          from,
          to: [c.email],
          ...(branding.replyTo ? { reply_to: branding.replyTo } : {}),
          subject: n.subject,
          html,
          text,
          headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          tags: [{ name: 'newsletter', value: String(newsletterId) }],
        }
      })
      const resendIds = await sendBatch(payload, emails)
      await run(
        payload,
        sql`UPDATE newsletter_deliveries d SET status = 'sent', resend_id = v.rid, sent_at = now(), updated_at = now()
            FROM (SELECT unnest(${intArray(ids)}) AS id, unnest(${textArray(resendIds)}) AS rid) v
            WHERE d.id = v.id`,
      )
    } catch (err) {
      payload.logger.error({ err }, `Newsletter ${newsletterId}: a batch failed to send`)
      const message = (err instanceof Error ? err.message : String(err)).slice(0, 300)
      await run(payload, sql`UPDATE newsletter_deliveries SET status = 'failed', error = ${message}, updated_at = now() WHERE id = ANY(${intArray(ids)})`)
    }
    if (sendingMode() === 'live') await new Promise((r) => setTimeout(r, 600)) // stay under Resend's rate limit
  }

  const stats = await newsletterStats(payload, newsletterId)
  if (stats.pending === 0) {
    await payload.update({ collection: 'newsletters', id: newsletterId, data: { status: 'sent', sentAt: n.sentAt ?? new Date().toISOString() }, overrideAccess: true, context: { disableRevalidate: true } })
  }
  return stats
}

/** Moves a draft/scheduled newsletter into sending: builds its recipient list. */
export async function startSending(payload: Payload, n: Newsletter, sentByName: string) {
  const total = await queueRecipients(payload, n)
  await payload.update({
    collection: 'newsletters',
    id: n.id,
    data: { status: 'sending', sentAt: new Date().toISOString(), sentByName },
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  return total
}
