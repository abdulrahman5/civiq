// Illustrations of the product, drawn in HTML/CSS so they stay sharp and match the real template.
// All names and numbers are fictional examples.

import { CHAMBERS, type Chamber } from '@/lib/themes'

export function SiteMock({ chamber = 'reps', domain = 'adaokafor.ng', name = 'Hon. Ada Okafor', badge = 'Member, House of Representatives', compact = false }: { chamber?: Chamber; domain?: string; name?: string; badge?: string; compact?: boolean }) {
  const t = CHAMBERS[chamber]
  return (
    <div className={`mk-browser${compact ? ' mk-browser--compact' : ''}`} style={{ ['--b' as string]: t.brand, ['--a' as string]: t.accent }} aria-hidden="true">
      <div className="mk-browser__bar">
        <span /><span /><span />
        <div className="mk-browser__url">🔒 {domain}</div>
      </div>
      <div className="mk-site">
        <div className="mk-site__nav">
          <b className="mk-site__mark">{name.replace(/^(Hon\.|Sen\.)\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 3)}</b>
          <i>{name}</i>
          <em>Join the movement</em>
        </div>
        <div className="mk-site__hero">
          <div>
            <small>{badge}</small>
            <strong>Delivering for <span>our people.</span></strong>
            <p />
            <p className="short" />
            <div className="mk-site__btns"><u /><u /></div>
          </div>
          <div className="mk-site__portrait" />
        </div>
        {!compact && (
          <div className="mk-site__stats">
            <div><b>2023</b><span>Elected</span></div>
            <div><b>14</b><span>Bills sponsored</span></div>
            <div><b>38</b><span>Projects</span></div>
          </div>
        )}
      </div>
    </div>
  )
}

export function JoinMock() {
  return (
    <div className="mk-card mk-mock" aria-hidden="true">
      <div className="mk-mock__title">Join the movement</div>
      <div className="mk-field"><span>Full name</span><i>Chinedu Eze</i></div>
      <div className="mk-field-row">
        <div className="mk-field"><span>Phone / WhatsApp</span><i>0803 000 0000</i></div>
        <div className="mk-field"><span>Ward</span><i>Nkpor</i></div>
      </div>
      <div className="mk-chips"><b className="on">Youth</b><b className="on">Jobs</b><b>Health</b><b>Education</b></div>
      <div className="mk-consent"><b>✓</b> I agree the office may contact me…</div>
      <div className="mk-pillbtn">Join</div>
      <div className="mk-float mk-float--tr">+128 supporters this week</div>
    </div>
  )
}

export function InboxMock() {
  const rows = [
    ['Amina Bello', 'Request support', 'The borehole in Ogidi has been broken…', true],
    ['Tunde Adeyemi', 'Invite to event', 'We would be honoured to host the Honourable…', true],
    ['Grace Okon', 'Share feedback', 'Thank you for the scholarship scheme…', false],
  ] as const
  return (
    <div className="mk-card mk-mock" aria-hidden="true">
      <div className="mk-tabs"><b className="on">Unread 2</b><b>Read 41</b><b>Archived 9</b></div>
      <ul className="mk-inbox">
        {rows.map(([n, topic, text, unread]) => (
          <li key={n} className={unread ? 'unread' : ''}>
            <div><b>{n}</b><span className="mk-tag">{topic}</span></div>
            <p>{text}</p>
          </li>
        ))}
      </ul>
      <div className="mk-reply"><span>Reply by email…</span><em>Send reply</em></div>
    </div>
  )
}

export function NewsletterMock() {
  return (
    <div className="mk-card mk-mock" aria-hidden="true">
      <div className="mk-email">
        <div className="mk-email__head"><small>Update from the office of</small><b>Hon. Ada Okafor</b></div>
        <div className="mk-email__body"><strong>Ogidi water project completed</strong><p /><p /><p className="short" /><em>Read the full update</em></div>
      </div>
      <div className="mk-statgrid">
        <div><span>Sent to</span><b>4,812</b></div>
        <div><span>Delivered</span><b>98%</b></div>
        <div><span>Opened</span><b>57%</b></div>
        <div><span>Clicked</span><b>12%</b></div>
      </div>
    </div>
  )
}

export function InsightsMock() {
  const weeks = [12, 18, 15, 26, 31, 28, 44, 52, 47, 63, 71, 88]
  const max = Math.max(...weeks)
  const wards = [['Nkpor', 612], ['Ogidi', 488], ['Obosi', 351], ['Umuoji', 207]] as const
  return (
    <div className="mk-card mk-mock" aria-hidden="true">
      <div className="mk-mock__title">Supporter growth <span>last 12 weeks</span></div>
      <div className="mk-bars">{weeks.map((w, i) => <i key={i} style={{ height: `${(w / max) * 100}%` }} />)}</div>
      <div className="mk-mock__title mk-mock__title--sm">Top wards</div>
      <ul className="mk-wards">
        {wards.map(([w, n]) => (
          <li key={w}><span>{w}</span><i><b style={{ width: `${(n / wards[0][1]) * 100}%` }} /></i><em>{n}</em></li>
        ))}
      </ul>
    </div>
  )
}

export function TeamMock() {
  const team = [['Ngozi A.', 'Admin', 'Active'], ['Ibrahim S.', 'Editor', 'Active'], ['Kemi O.', 'Contributor', 'Invited']] as const
  return (
    <div className="mk-card mk-mock" aria-hidden="true">
      <div className="mk-mock__title">Your team</div>
      <ul className="mk-team">
        {team.map(([n, r, s]) => (
          <li key={n}><b>{n.split(' ').map((p) => p[0]).join('')}</b><span>{n}<small>{r}</small></span><em className={s === 'Active' ? 'ok' : ''}>{s}</em></li>
        ))}
      </ul>
      <div className="mk-pillbtn mk-pillbtn--ghost">Invite a team member</div>
    </div>
  )
}
