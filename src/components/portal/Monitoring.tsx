import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { isPlatformAdmin } from '@/access'
import { siteHealth, type SiteHealth } from '@/lib/monitoring'
import { getPortalUrl } from '@/lib/site-url'
import { StatTile } from './charts'
import { CheckNow } from './CheckNow'
import { fmt } from './context'

const LABEL: Record<SiteHealth['status'], string> = { down: 'Down', attention: 'Needs attention', healthy: 'Healthy', unchecked: 'Not checked', suspended: 'Suspended' }
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  return `${Math.round(mins / 1440)} days ago`
}
const days = (n: number | null, none: string) => (n === null ? none : n === 0 ? 'today' : `${n} d ago`)

// /admin/monitoring (Civiq Admin): the live status and health of every legislator site.
export async function Monitoring({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fmonitoring')
  const template = (children: React.ReactNode) => (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} searchParams={searchParams} user={req.user ?? undefined} visibleEntities={visibleEntities} req={req}>
      <Gutter className="cq-portal">{children}</Gutter>
    </DefaultTemplate>
  )
  if (!isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0])) {
    return template(<header className="cq-head"><h1>Site health</h1><p className="cq-muted">Site health is for the Civiq team.</p></header>)
  }

  const sites = await siteHealth(req.payload)
  const count = (s: SiteHealth['status']) => sites.filter((x) => x.status === s).length
  const lastRun = sites.map((s) => s.lastCheck?.at).filter(Boolean).sort().at(-1)
  const urgent = sites.reduce((n, s) => n + s.urgentSupport, 0)

  return template(
    <>
      <header className="cq-head cq-health__head">
        <div>
          <h1>Site health</h1>
          <p className="cq-muted">
            Live status and health of every legislator site. {lastRun ? `Last check ${ago(lastRun)}.` : 'No checks yet.'} Sites are checked on a schedule; the Civiq team is emailed when a live site goes down or comes back.
          </p>
        </div>
        <CheckNow />
      </header>

      <div className="cq-stats">
        <StatTile label="Down" value={fmt(count('down'))} note={count('down') ? 'Live sites not loading' : 'All live sites loading'} />
        <StatTile label="Needs attention" value={fmt(count('attention') + count('unchecked'))} note="See reasons below" />
        <StatTile label="Healthy" value={fmt(count('healthy'))} note={`of ${fmt(sites.length)} sites`} />
        <StatTile label="Urgent support requests" value={fmt(urgent)} href="/admin/collections/support-requests?where[priority][equals]=urgent&where[status][not_equals]=resolved" />
      </div>

      <section className="cq-card">
        <h2>All sites</h2>
        <div className="cq-table-wrap">
          <table className="cq-table cq-health">
            <thead>
              <tr>
                <th>Legislator</th>
                <th>Status</th>
                <th>Address checked</th>
                <th className="num">Response</th>
                <th className="num">Uptime (7 days)</th>
                <th className="num">Supporters</th>
                <th className="num">Unread</th>
                <th>Last news</th>
                <th>Team active</th>
                <th className="num">Support</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className={`cq-health__row--${s.status}`}>
                  <td>
                    <a href={`/admin/collections/tenants/${s.id}`}><b>{s.name}</b></a>
                    <div className="cq-muted cq-health__small">{s.chamber}</div>
                    {s.reasons.length > 0 && (
                      <ul className="cq-health__reasons">
                        {s.reasons.map((r) => (
                          <li key={r.text} className={`cq-health__reason--${r.level}`}>{r.text}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td><span className={`cq-health__pill cq-health__pill--${s.status}`}>{LABEL[s.status]}</span></td>
                  <td>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener">{s.url.replace(/^https?:\/\//, '')} ↗</a> : <span className="cq-muted">None</span>}
                    {!s.domain && s.url && <div className="cq-muted cq-health__small">Preview address</div>}
                    {s.lastCheck && <div className="cq-muted cq-health__small">Checked {ago(s.lastCheck.at)}</div>}
                  </td>
                  <td className="num">{s.lastCheck?.responseMs != null ? `${fmt(s.lastCheck.responseMs)} ms` : '–'}</td>
                  <td className="num">{s.uptime7d != null ? `${s.uptime7d}%` : '–'}</td>
                  <td className="num">{fmt(s.supporters)}{s.new7 ? <div className="cq-muted cq-health__small">+{fmt(s.new7)} this week</div> : null}</td>
                  <td className="num">{fmt(s.unread)}</td>
                  <td>{days(s.daysSinceNews, 'Never')}</td>
                  <td>{days(s.lastTeamActivityDays, 'Never')}</td>
                  <td className="num">
                    {s.openSupport ? <a href={`/admin/collections/support-requests?where[tenant][equals]=${s.id}&where[status][not_equals]=resolved`}>{fmt(s.openSupport)} open</a> : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="cq-muted cq-health__small">
          Down = the live site does not load or shows “Site not found”. Needs attention = it loads, but something below needs action. To see a site as its team does, use <b>Open in portal</b> on Home ({getPortalUrl().replace(/^https?:\/\//, '')}).
        </p>
      </section>
    </>,
  )
}
