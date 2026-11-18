import type { Row } from '@/lib/insights'
import { fmt, pct } from './context'

// Server-rendered, single-series charts: one hue, thin bars, values as text, a hover tooltip on every
// mark and a screen-reader table, so nothing is told by colour alone.

const weekLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })

/** New sign-ups per week as vertical bars. */
export function WeeklyBars({ data, caption }: { data: { week: string; n: number }[]; caption: string }) {
  const max = Math.max(1, ...data.map((d) => d.n))
  const total = data.reduce((s, d) => s + d.n, 0)
  const last = data[data.length - 1]
  return (
    <figure className="cq-weekly">
      <figcaption className="cq-sr-only">{caption}</figcaption>
      <div className="cq-weekly__plot" aria-hidden="true">
        {data.map((d, i) => (
          <div key={d.week} className="cq-weekly__col" data-tip={`Week of ${weekLabel(d.week)}: ${fmt(d.n)} new`}>
            {i === data.length - 1 && <span className="cq-weekly__value">{fmt(d.n)}</span>}
            <div className="cq-weekly__bar" style={{ height: `${Math.max(d.n ? 4 : 0, (d.n / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="cq-weekly__axis" aria-hidden="true">
        <span>{data[0] && weekLabel(data[0].week)}</span>
        <span>This week so far</span>
      </div>
      <p className="cq-chart-note">
        {fmt(total)} new in the last {data.length} weeks{last ? ` · ${fmt(last.n)} so far this week (since Monday)` : ''}
      </p>
      <table className="cq-sr-only">
        <caption>{caption}</caption>
        <thead><tr><th>Week starting</th><th>New supporters</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.week}><td>{weekLabel(d.week)}</td><td>{d.n}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}

/** A ranked list with a bar per row, its count and its share of `total`. */
export function BarList({ rows, total, empty, unit = 'supporters' }: { rows: Row[]; total: number; empty: string; unit?: string }) {
  if (!rows.length) return <p className="cq-empty">{empty}</p>
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <ul className="cq-barlist">
      {rows.map((r) => (
        <li key={r.label} data-tip={`${r.label}: ${fmt(r.n)} ${unit} (${pct(r.n, total)}%)`}>
          <span className="cq-barlist__label">{r.label}</span>
          <span className="cq-barlist__track" aria-hidden="true">
            <span className="cq-barlist__bar" style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }} />
          </span>
          <span className="cq-barlist__value">
            {fmt(r.n)} <span className="cq-muted">· {pct(r.n, total)}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function StatTile({ label, value, note, href }: { label: string; value: string; note?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="cq-stat__label">{label}</span>
      <span className="cq-stat__value">{value}</span>
      {note && <span className="cq-stat__note">{note}</span>}
    </>
  )
  return href ? <a className="cq-stat" href={href}>{body}</a> : <div className="cq-stat">{body}</div>
}

/** "▲ 18% vs the 7 days before" in words as well as an arrow. */
export function Trend({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span className="cq-muted">None in the 7 days before either</span>
  if (!before) return <span>Up from 0 the 7 days before</span>
  const change = Math.round(((now - before) / before) * 100)
  if (change === 0) return <span className="cq-muted">Same as the 7 days before</span>
  return <span>{change > 0 ? '▲' : '▼'} {Math.abs(change)}% vs the 7 days before ({fmt(before)})</span>
}
