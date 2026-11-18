import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { countAudience, multiBreakdown, supporterTotals, topPlaces, weeklySignups } from '@/lib/insights'
import { BarList, StatTile, Trend, WeeklyBars } from './charts'
import { fmt, getPortalContext, pct } from './context'

// /admin/community: who the legislator's supporters are, and their saved audiences.
export async function Community({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login?redirect=%2Fadmin%2Fcommunity')

  const ctx = await getPortalContext(req.payload, req.user)
  const template = (children: React.ReactNode) => (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
      req={req}
    >
      <Gutter className="cq-portal">{children}</Gutter>
    </DefaultTemplate>
  )

  if (!ctx.tenant) {
    return template(
      <header className="cq-head">
        <h1>Community</h1>
        <p className="cq-muted">Choose a legislator in the <b>Legislator</b> menu on the left first.</p>
      </header>,
    )
  }
  if (!ctx.canSeeCommunity) {
    return template(
      <header className="cq-head">
        <h1>Community</h1>
        <p className="cq-muted">Supporter details are available to the team’s admins and editors.</p>
      </header>,
    )
  }

  const t = ctx.tenant.id
  const payload = req.payload
  const [sup, weekly, wards, lgas, states, interests, channels, audiences] = await Promise.all([
    supporterTotals(payload, t),
    weeklySignups(payload, t, 12),
    topPlaces(payload, t, 'ward', 10),
    topPlaces(payload, t, 'lga', 10),
    topPlaces(payload, t, 'state', 6),
    multiBreakdown(payload, t, 'interests'),
    multiBreakdown(payload, t, 'channels'),
    payload.find({ collection: 'audiences', where: { tenant: { equals: t } }, depth: 0, limit: 50, sort: 'name', overrideAccess: true }),
  ])
  const audienceCounts = await Promise.all(audiences.docs.map((a) => countAudience(payload, t, a)))

  return template(
    <>
      <header className="cq-head cq-head--row">
        <div>
          <h1>Community</h1>
          <p className="cq-muted">{ctx.tenant.name} · supporters who joined the movement on the website</p>
        </div>
        <div className="cq-head__actions">
          <a className="btn btn--style-secondary btn--size-small" href="/api/supporters/export-csv">Download CSV</a>
          <a className="btn btn--style-primary btn--size-small" href="/admin/collections/supporters">View all supporters</a>
        </div>
      </header>

      <div className="cq-stats">
        <StatTile label="Subscribed supporters" value={fmt(sup.subscribed)} />
        <StatTile label="New (last 7 days)" value={fmt(sup.new7)} note={<Trend now={sup.new7} before={sup.prev7} />} />
        <StatTile label="Can receive email" value={fmt(sup.withEmail)} note={`${pct(sup.withEmail, sup.subscribed)}% of subscribed`} />
        <StatTile label="Unsubscribed" value={fmt(sup.unsubscribed)} note="Never contacted again" />
      </div>

      <section className="cq-card">
        <div className="cq-card__head"><h2>New supporters per week</h2></div>
        <WeeklyBars data={weekly} caption="New supporters per week, last 12 weeks" />
      </section>

      <div className="cq-grid">
        <section className="cq-card">
          <h2>By ward</h2>
          <BarList rows={wards} total={sup.subscribed} empty="No wards recorded yet." />
        </section>
        <section className="cq-card">
          <h2>By LGA</h2>
          <BarList rows={lgas} total={sup.subscribed} empty="No LGAs recorded yet." />
        </section>
        <section className="cq-card">
          <h2>Interests</h2>
          <p className="cq-chart-note">A supporter can choose several.</p>
          <BarList rows={interests} total={sup.subscribed} empty="No interests recorded yet." />
        </section>
        <section className="cq-card">
          <h2>Preferred contact</h2>
          <BarList rows={channels} total={sup.subscribed} empty="No preferences recorded yet." />
          {states.length > 1 && (
            <>
              <h2 className="cq-subhead">By state</h2>
              <BarList rows={states} total={sup.subscribed} empty="" />
            </>
          )}
        </section>
      </div>

      <section className="cq-card">
        <div className="cq-card__head">
          <h2>Saved audiences</h2>
          <a className="btn btn--style-primary btn--size-small" href="/admin/collections/audiences/create">New audience</a>
        </div>
        {audiences.docs.length ? (
          <div className="cq-table-wrap">
            <table className="cq-table">
              <thead><tr><th>Audience</th><th>Who is included</th><th className="num">Supporters</th></tr></thead>
              <tbody>
                {audiences.docs.map((a, i) => {
                  const rules = [
                    a.wards?.length && `Wards: ${a.wards.join(', ')}`,
                    a.lgas?.length && `LGAs: ${a.lgas.join(', ')}`,
                    a.states?.length && `States: ${a.states.join(', ')}`,
                    a.interests?.length && `Interested in: ${a.interests.join(', ')}`,
                    a.channels?.length && `Prefers: ${a.channels.join(', ')}`,
                    a.requireEmail && 'Has an email address',
                  ].filter(Boolean)
                  return (
                    <tr key={a.id}>
                      <td><a href={`/admin/collections/audiences/${a.id}`}>{a.name}</a></td>
                      <td className="cq-muted">{rules.length ? rules.join(' · ') : 'Everyone subscribed'}</td>
                      <td className="num">{fmt(audienceCounts[i] ?? 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cq-empty">No saved audiences yet. Create one, such as “Youth in Bida LGA”, to send newsletters to the right people.</p>
        )}
      </section>
    </>,
  )
}
