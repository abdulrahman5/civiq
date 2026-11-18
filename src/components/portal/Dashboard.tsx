import { Gutter } from '@payloadcms/ui'
import type { Payload } from 'payload'

import { countPlaceholders, messageTotals, multiBreakdown, newsTotals, platformOverview, supporterTotals, topPlaces, weeklySignups } from '@/lib/insights'
import { BarList, StatTile, Trend, WeeklyBars } from './charts'
import { fmt, getPortalContext } from './context'

type Props = { payload: Payload; user?: unknown }

const greeting = () => {
  const hour = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Lagos' }))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })
}

/** Placeholder text like “[Project name]” still on the site, counted across settings and about. */
// The portal's Home screen (replaces Payload's default dashboard).
export async function Dashboard({ payload, user }: Props) {
  if (!user) return null
  const ctx = await getPortalContext(payload, user)
  const firstName = ctx.user.name?.split(' ')[0] ?? ''

  if (!ctx.tenant) {
    const sites = ctx.platformAdmin ? await platformOverview(payload) : []
    return (
      <Gutter className="cq-portal">
        <header className="cq-head">
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
          <p className="cq-muted">Choose a legislator in the <b>Legislator</b> menu on the left to see their dashboard.</p>
        </header>
        {ctx.platformAdmin && (
          <section className="cq-card">
            <h2>All legislator sites</h2>
            <div className="cq-table-wrap">
              <table className="cq-table">
                <thead><tr><th>Legislator</th><th>Main domain</th><th className="num">Supporters</th><th className="num">New (7 days)</th><th className="num">Unread messages</th><th>Status</th></tr></thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s.id}>
                      <td><a href={`/admin/collections/tenants/${s.id}`}>{s.name}</a></td>
                      <td>{s.domain ?? <span className="cq-muted">Not set</span>}</td>
                      <td className="num">{fmt(s.supporters)}</td>
                      <td className="num">{fmt(s.new7)}</td>
                      <td className="num">{fmt(s.unread)}</td>
                      <td>{s.status === 'active' ? 'Active' : 'Suspended'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </Gutter>
    )
  }

  const t = ctx.tenant.id
  const [news, placeholders] = await Promise.all([newsTotals(payload, t), countPlaceholders(payload, t)])
  const siteUrl = ctx.tenant.primaryDomain ? `https://${ctx.tenant.primaryDomain}` : null

  const header = (
    <header className="cq-head">
      <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
      <p className="cq-muted">
        {ctx.tenant.name}
        {siteUrl && <> · <a href={siteUrl} target="_blank" rel="noopener">{ctx.tenant.primaryDomain} ↗</a></>}
      </p>
    </header>
  )

  if (!ctx.canSeeCommunity) {
    return (
      <Gutter className="cq-portal">
        {header}
        <div className="cq-stats">
          <StatTile label="Published news" value={fmt(news.published)} href="/admin/collections/news" />
          <StatTile label="Drafts" value={fmt(news.drafts)} note="Waiting for an editor to publish" href="/admin/collections/news" />
        </div>
        <QuickActions community={false} />
      </Gutter>
    )
  }

  const [sup, msgs, weekly, wards, interests, recent, lastNewsletter] = await Promise.all([
    supporterTotals(payload, t),
    messageTotals(payload, t),
    weeklySignups(payload, t, 12),
    topPlaces(payload, t, 'ward', 5),
    multiBreakdown(payload, t, 'interests'),
    payload.find({
      collection: 'messages',
      where: { tenant: { equals: t } },
      sort: '-createdAt',
      limit: 5,
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    }),
    payload
      .find({ collection: 'newsletters', where: { tenant: { equals: t }, status: { in: ['sending', 'sent'] } }, sort: '-sentAt', limit: 1, depth: 0, overrideAccess: false, user: ctx.user })
      .then((r) => r.docs[0] ?? null),
  ])

  const daysSinceNews = news.lastPublished ? Math.floor((Date.now() - new Date(news.lastPublished).getTime()) / 86400000) : null
  const daysSinceNewsletter = lastNewsletter?.sentAt ? Math.floor((Date.now() - new Date(lastNewsletter.sentAt).getTime()) / 86400000) : null
  const attention = [
    msgs.unread > 0 && { text: `${fmt(msgs.unread)} unread ${msgs.unread === 1 ? 'message' : 'messages'} in the inbox`, href: '/admin/collections/messages?where[status][equals]=unread' },
    news.drafts > 0 && { text: `${fmt(news.drafts)} news ${news.drafts === 1 ? 'draft' : 'drafts'} not yet published`, href: '/admin/collections/news?where[_status][equals]=draft' },
    (daysSinceNews === null || daysSinceNews > 21) && { text: daysSinceNews === null ? 'No news published yet' : `No news published in ${daysSinceNews} days`, href: '/admin/collections/news/create' },
    sup.withEmail > 0 &&
      (daysSinceNewsletter === null || daysSinceNewsletter > 30) && {
        text: daysSinceNewsletter === null ? `No newsletter sent yet: ${fmt(sup.withEmail)} supporters can receive email` : `No newsletter sent in ${daysSinceNewsletter} days`,
        href: '/admin/collections/newsletters/create',
      },
    placeholders > 0 && { text: `${fmt(placeholders)} placeholder ${placeholders === 1 ? 'text' : 'texts'} like “[…]” still on the website`, href: '/admin/collections/site-settings' },
    !ctx.tenant.primaryDomain && ctx.platformAdmin && { text: 'No main domain set: the site is not yet visible to search engines', href: `/admin/collections/tenants/${t}` },
  ].filter(Boolean) as { text: string; href: string }[]

  return (
    <Gutter className="cq-portal">
      {header}

      <div className="cq-stats">
        <StatTile label="Supporters" value={fmt(sup.subscribed)} note={`${fmt(sup.withEmail)} can receive email`} href="/admin/community" />
        <StatTile label="New (last 7 days)" value={fmt(sup.new7)} note={<Trend now={sup.new7} before={sup.prev7} />} href="/admin/community" />
        <StatTile label="Unread messages" value={fmt(msgs.unread)} note={`${fmt(msgs.week)} received this week`} href="/admin/collections/messages?where[status][equals]=unread" />
        <StatTile label="Published news" value={fmt(news.published)} note={news.drafts ? `${fmt(news.drafts)} in draft` : 'No drafts'} href="/admin/collections/news" />
      </div>

      {attention.length > 0 && (
        <section className="cq-card cq-attention" aria-label="Needs attention">
          <h2>Needs attention</h2>
          <ul>{attention.map((a) => <li key={a.text}><a href={a.href}>{a.text} →</a></li>)}</ul>
        </section>
      )}

      <div className="cq-grid">
        <section className="cq-card">
          <div className="cq-card__head"><h2>Supporter growth</h2><a href="/admin/community">Community insights →</a></div>
          <WeeklyBars data={weekly} caption="New supporters per week, last 12 weeks" />
        </section>
        <section className="cq-card">
          <div className="cq-card__head"><h2>Latest messages</h2><a href="/admin/collections/messages">Inbox →</a></div>
          {recent.docs.length ? (
            <ul className="cq-list">
              {recent.docs.map((m) => (
                <li key={m.id}>
                  <a href={`/admin/collections/messages/${m.id}`}>
                    <span className="cq-list__title">{m.status === 'unread' && <span className="cq-pill">Unread</span>} {m.name}</span>
                    <span className="cq-muted">{[m.topic, m.ward].filter(Boolean).join(' · ')} · {ago(m.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cq-empty">No messages yet. They appear here when people use the contact form on the website.</p>
          )}
        </section>
        <section className="cq-card">
          <div className="cq-card__head"><h2>Top wards</h2><a href="/admin/community">All places →</a></div>
          <BarList rows={wards} total={sup.subscribed} empty="No wards yet. Supporters add their ward when they join." />
        </section>
        <section className="cq-card">
          <div className="cq-card__head"><h2>What supporters care about</h2></div>
          <BarList rows={interests.slice(0, 5)} total={sup.subscribed} empty="No interests yet. Supporters pick them when they join." />
        </section>
      </div>

      <QuickActions community />
    </Gutter>
  )
}

function QuickActions({ community }: { community: boolean }) {
  return (
    <section className="cq-actions" aria-label="Quick actions">
      <a className="btn btn--style-primary btn--size-medium" href="/admin/collections/news/create">Post news</a>
      {community && <a className="btn btn--style-secondary btn--size-medium" href="/admin/collections/newsletters/create">Send a newsletter</a>}
      {community && <a className="btn btn--style-secondary btn--size-medium" href="/admin/collections/messages">Open inbox</a>}
      {community && <a className="btn btn--style-secondary btn--size-medium" href="/admin/community">Community insights</a>}
      {community && <a className="btn btn--style-secondary btn--size-medium" href="/api/supporters/export-csv">Download supporters (CSV)</a>}
      <a className="btn btn--style-secondary btn--size-medium" href="/admin/collections/projects/create">Add a project</a>
    </section>
  )
}
