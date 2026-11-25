import { Gutter } from '@payloadcms/ui'
import { headers } from 'next/headers'
import type { Payload } from 'payload'

import { appForHost, getAdminUrl, requestHost } from '@/lib/apps'
import { getPortalUrl } from '@/lib/site-url'
import { siteHealth } from '@/lib/monitoring'
import { openSupportRequests } from '@/lib/support'

import { countPlaceholders, messageTotals, multiBreakdown, newsTotals, platformOverview, supporterTotals, topPlaces, weeklySignups } from '@/lib/insights'
import { BarList, StatTile, Trend, WeeklyBars } from './charts'
import { OpenDashboard } from './OpenDashboard'
import { IconActivity, IconAlert, IconArrow, IconBriefcase, IconChart, IconCheck, IconDownload, IconExternal, IconInbox, IconLandmark, IconLifeBuoy, IconMail, IconNews, IconPlus, IconUsers } from './icons'
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
  // On the Civiq Admin address, Home is always the all-sites overview; a legislator's dashboard opens in the Portal.
  const inAdmin = appForHost(requestHost(await headers())) === 'admin'
  const adminUrl = getAdminUrl()
  const settingsHref = (id: number) => (inAdmin || !adminUrl ? '' : adminUrl) + `/admin/collections/tenants/${id}`

  if (!ctx.tenant || inAdmin) {
    const [sites, support, health] = ctx.platformAdmin
      ? await Promise.all([platformOverview(payload), openSupportRequests(payload), inAdmin ? siteHealth(payload) : Promise.resolve(null)])
      : [[], null, null]
    const down = health?.filter((h) => h.status === 'down').length ?? 0
    const attention = health?.filter((h) => h.status === 'attention' || h.status === 'unchecked').length ?? 0
    return (
      <Gutter className="cq-portal">
        <header className="cq-head">
          <p className="cq-hero__date">{today()}</p>
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
          {inAdmin ? (
            <p className="cq-muted">Civiq Admin: every legislator site at a glance. <b>Open in portal</b> shows a legislator's dashboard as their team sees it.</p>
          ) : (
            <p className="cq-muted">Click a legislator below to open their dashboard. You can also switch with the <b>Legislator</b> menu in the sidebar (☰).</p>
          )}
        </header>
        {health && (
          <div className="cq-stats">
            <StatTile label="Legislator sites" value={fmt(sites.length)} note={`${fmt(sites.filter((x) => x.domain).length)} on their own domain`} href="/admin/collections/tenants" icon={<IconLandmark />} />
            <StatTile label="Supporters, all sites" value={fmt(sites.reduce((n, x) => n + x.supporters, 0))} note={`+${fmt(sites.reduce((n, x) => n + x.new7, 0))} in the last 7 days`} icon={<IconUsers />} />
            <StatTile
              label="Open support requests"
              value={fmt(support?.total ?? 0)}
              note={`${fmt(health.reduce((n, x) => n + x.urgentSupport, 0))} urgent`}
              href="/admin/collections/support-requests?where[status][not_equals]=resolved"
              icon={<IconLifeBuoy />}
              tone={health.some((x) => x.urgentSupport) ? 'danger' : support?.total ? 'warn' : undefined}
            />
            <StatTile label="Sites down" value={fmt(down)} note={attention ? `${fmt(attention)} need attention` : 'Everything else healthy'} href="/admin/monitoring" icon={<IconActivity />} tone={down ? 'danger' : attention ? 'warn' : undefined} />
          </div>
        )}
        {ctx.platformAdmin && (
          <section className="cq-card">
            <h2>All legislator sites</h2>
            <div className="cq-table-wrap">
              <table className="cq-table">
                <thead><tr><th>Legislator</th><th>Template</th><th>Main domain</th><th className="num">Supporters</th><th className="num">New (7 days)</th><th className="num">Unread messages</th><th>Status</th><th><span className="cq-sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {sites.map((s) => (
                    <tr key={s.id}>
                      <td>{inAdmin ? <a href={`/admin/collections/tenants/${s.id}`}>{s.name}</a> : <OpenDashboard id={s.id} name={s.name} />}</td>
                      <td><span className={`cq-badge cq-badge--${s.chamber === 'senate' ? 'senate' : 'reps'}`}>{s.chamber === 'senate' ? 'Senate' : 'House of Reps'}</span></td>
                      <td>{s.domain ?? <span className="cq-muted">Not set</span>}</td>
                      <td className="num">{fmt(s.supporters)}</td>
                      <td className="num">{fmt(s.new7)}</td>
                      <td className="num">{fmt(s.unread)}</td>
                      <td><span className={`cq-badge cq-badge--${s.status === 'active' ? 'good' : 'danger'}`}>{s.status === 'active' ? 'Active' : 'Suspended'}</span></td>
                      <td>
                        {inAdmin ? (
                          <a href={`${getPortalUrl()}/admin?legislator=${s.id}`} target="_blank" rel="noopener" className="cq-muted">Open in portal ↗</a>
                        ) : (
                          <a href={settingsHref(s.id)} className="cq-muted">Site settings</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {support && (
          <section className="cq-card">
            <div className="cq-card__head">
              <h2>Open support requests ({fmt(support.total)})</h2>
              <a href="/admin/collections/support-requests?where[status][not_equals]=resolved">All open requests →</a>
            </div>
            {support.docs.length === 0 ? (
              <p className="cq-muted">Nothing open. Every request has been resolved.</p>
            ) : (
              <div className="cq-table-wrap">
                <table className="cq-table">
                  <thead><tr><th>Request</th><th>Legislator</th><th>Status</th><th>Last activity</th></tr></thead>
                  <tbody>
                    {support.docs.map((r) => (
                      <tr key={r.id}>
                        <td>
                          {r.priority === 'urgent' && <b className="cq-urgent">Urgent</b>} <a href={`/admin/collections/support-requests/${r.id}`}>{r.subject}</a>
                        </td>
                        <td>{typeof r.tenant === 'object' && r.tenant ? r.tenant.name : ''}</td>
                        <td><span className={`cq-badge cq-badge--${r.status === 'new' ? 'warn' : 'info'}`}>{({ new: 'New', 'in-progress': 'In progress', waiting: 'Waiting on office' } as Record<string, string>)[r.status ?? ''] ?? r.status}</span></td>
                        <td>{r.lastActivityAt ? ago(r.lastActivityAt) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </Gutter>
    )
  }

  const t = ctx.tenant.id
  const [news, placeholders] = await Promise.all([newsTotals(payload, t), countPlaceholders(payload, t)])
  const siteUrl = ctx.tenant.primaryDomain ? `https://${ctx.tenant.primaryDomain}` : null

  const header = (
    <header className="cq-head cq-hero">
      <div>
        <p className="cq-hero__date">{today()}</p>
        <h1>{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        <div className="cq-hero__meta">
          <span className="cq-chip"><IconLandmark size={15} /> {ctx.tenant.name}</span>
          {siteUrl && <a className="cq-chip" href={siteUrl} target="_blank" rel="noopener">{ctx.tenant.primaryDomain} <IconExternal size={14} /></a>}
        </div>
      </div>
    </header>
  )

  if (!ctx.canSeeCommunity) {
    return (
      <Gutter className="cq-portal">
        {header}
        <QuickActions community={false} />
        <div className="cq-stats">
          <StatTile label="Published news" value={fmt(news.published)} href="/admin/collections/news" icon={<IconNews />} />
          <StatTile label="Drafts" value={fmt(news.drafts)} note="Waiting for an editor to publish" href="/admin/collections/news" icon={<IconNews />} tone={news.drafts ? 'warn' : undefined} />
        </div>
      </Gutter>
    )
  }

  const [sup, msgs, weekly, wards, interests, recent, lastNewsletter, waitingOnUs] = await Promise.all([
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
    payload.count({ collection: 'support-requests', where: { tenant: { equals: t }, status: { equals: 'waiting' } }, overrideAccess: true }).then((r) => r.totalDocs),
  ])

  const daysSinceNews = news.lastPublished ? Math.floor((Date.now() - new Date(news.lastPublished).getTime()) / 86400000) : null
  const daysSinceNewsletter = lastNewsletter?.sentAt ? Math.floor((Date.now() - new Date(lastNewsletter.sentAt).getTime()) / 86400000) : null
  const attention = [
    waitingOnUs > 0 && { text: `The Civiq team is waiting for your reply on ${waitingOnUs} support ${waitingOnUs === 1 ? 'request' : 'requests'}`, href: '/admin/collections/support-requests?where[status][equals]=waiting' },
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
      <QuickActions community />

      <div className="cq-stats">
        <StatTile label="Supporters" value={fmt(sup.subscribed)} note={`${fmt(sup.withEmail)} can receive email`} href="/admin/community" icon={<IconUsers />} />
        <StatTile label="New (last 7 days)" value={fmt(sup.new7)} note={<Trend now={sup.new7} before={sup.prev7} />} href="/admin/community" icon={<IconChart />} />
        <StatTile label="Unread messages" value={fmt(msgs.unread)} note={`${fmt(msgs.week)} received this week`} href="/admin/collections/messages?where[status][equals]=unread" icon={<IconInbox />} tone={msgs.unread ? 'warn' : undefined} />
        <StatTile label="Published news" value={fmt(news.published)} note={news.drafts ? `${fmt(news.drafts)} in draft` : 'No drafts'} href="/admin/collections/news" icon={<IconNews />} />
      </div>

      {attention.length > 0 ? (
        <section className="cq-card cq-attention" aria-label="Needs attention">
          <h2><IconAlert size={18} /> Needs attention</h2>
          <ul>{attention.map((a) => <li key={a.text}><a href={a.href}><span>{a.text}</span> <IconArrow size={16} /></a></li>)}</ul>
        </section>
      ) : (
        <section className="cq-card cq-allclear" aria-label="Needs attention"><IconCheck size={20} /> All clear: nothing needs your attention right now.</section>
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
            <p className="cq-empty"><IconInbox size={18} /> No messages yet. They appear here when people use the contact form on the website.</p>
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
    </Gutter>
  )
}

function QuickActions({ community }: { community: boolean }) {
  return (
    <nav className="cq-quick" aria-label="Quick actions">
      <a className="cq-quick--primary" href="/admin/collections/news/create"><IconPlus size={16} /> Post news</a>
      {community && <a href="/admin/collections/newsletters/create"><IconMail size={16} /> Send a newsletter</a>}
      {community && <a href="/admin/collections/messages"><IconInbox size={16} /> Open inbox</a>}
      <a href="/admin/collections/projects/create"><IconBriefcase size={16} /> Add a project</a>
      {community && <a href="/api/supporters/export-csv"><IconDownload size={16} /> Download supporters</a>}
    </nav>
  )
}

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' })
