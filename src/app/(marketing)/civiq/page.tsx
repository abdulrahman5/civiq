import Link from 'next/link'

import { LEAD_ROLES } from '@/collections/Leads'
import { getCiviqSettings, getShowcase, leadConsentText } from '@/lib/marketing'
import { CHAMBER_OPTIONS } from '@/lib/themes'
import { submitLead } from './actions'
import { DemoForm } from './DemoForm'
import { InboxMock, InsightsMock, JoinMock, NewsletterMock, SiteMock, TeamMock } from './Mocks'

export const revalidate = 3600 // and immediately whenever a legislator site changes (src/hooks/revalidate.ts)

const FEATURES = [
  {
    id: 'website',
    eyebrow: 'Your website',
    title: 'A professional site on your own domain',
    text: 'Biography, agenda, projects, news and photos, on an address like yourname.ng. Fast on any phone, ready for Google and WhatsApp sharing, with HTTPS included.',
    points: ['Your name as the domain', 'News, projects and timeline', 'Updates go live the moment you save'],
    Mock: () => <SiteMock compact />,
  },
  {
    id: 'supporters',
    eyebrow: 'Supporters',
    title: 'Turn visitors into a movement',
    text: '“Join the movement” collects supporters with their ward, interests and how they want to be contacted. Consent is recorded with every sign-up, as the law expects.',
    points: ['Ward, LGA and interests', 'Consent recorded automatically', 'Download your list any time'],
    Mock: JoinMock,
  },
  {
    id: 'inbox',
    eyebrow: 'Inbox',
    title: 'Every message in one place, answered by email',
    text: 'Messages from your website land in one shared inbox. Your team reads, replies from the office’s name and archives. Simple by design, with no complicated case management.',
    points: ['Unread, read and archived', 'Reply from the office’s name', 'Every reply logged'],
    Mock: InboxMock,
  },
  {
    id: 'newsletters',
    eyebrow: 'Newsletters',
    title: 'Speak directly to the people who chose to hear from you',
    text: 'Write an update, send yourself a test, then send to everyone or just one ward or interest group. See how many received, opened and clicked.',
    points: ['Send to everyone or a saved audience', 'Schedule for later', 'One-click unsubscribe built in'],
    Mock: NewsletterMock,
  },
  {
    id: 'insights',
    eyebrow: 'Community insights',
    title: 'Know where your support is growing',
    text: 'See new supporters week by week, your strongest wards and LGAs, and what people care about most. Evidence for every briefing and campaign decision.',
    points: ['Weekly growth', 'Top wards and interests', 'Saved audiences for outreach'],
    Mock: InsightsMock,
  },
  {
    id: 'team',
    eyebrow: 'Your team',
    title: 'Run by your office, not by developers',
    text: 'Invite your chief of staff, media aide and constituency officers. Each gets the right level of access, and nobody needs to write code or share passwords.',
    points: ['Admin, Editor and Contributor roles', 'Invite by email or WhatsApp', 'See who is active'],
    Mock: TeamMock,
  },
] as const

const FAQ = [
  ['How long does it take to launch?', 'About a week once we have your photos and content. We set everything up and train your team; you approve the site before it goes live.'],
  ['Do I need to buy a domain?', 'We recommend a domain in your own name, such as yourname.ng. We can guide you through registering it, and we connect it for you.'],
  ['Who updates the site?', 'Your own team, from the Civiq Portal. Posting news or sending a newsletter takes minutes, with no technical skills needed.'],
  ['Can we use our own colours or design?', 'Every Senate site uses the Senate theme and every House site uses the House theme. That keeps each site official, consistent and quick to launch. Your photos, words and achievements make it yours.'],
  ['Who owns the supporter data?', 'Your office does. Under the Nigeria Data Protection Act your office is the data controller and Civiq processes the data on your behalf. You can download it at any time.'],
  ['What does it cost?', 'Plans depend on the size and needs of your office. Request a demo and we will walk you through the options.'],
  ['Is it only for federal legislators?', 'Civiq is built for members of the National Assembly: Senators and Members of the House of Representatives.'],
] as const

export default async function CiviqHome() {
  const [showcase, settings] = await Promise.all([getShowcase(), getCiviqSettings()])
  const whatsapp = settings?.whatsapp?.replace(/[^\d]/g, '') || null

  return (
    <>
      {/* Hero */}
      <section className="mk-hero">
        <div className="mk-wrap mk-hero__grid">
          <div>
            <p className="mk-eyebrow mk-eyebrow--light">For Senators and Members of the House of Representatives</p>
            <h1>
              Your own digital platform, <span>built for the people you represent.</span>
            </h1>
            <p className="mk-lead">
              Civiq gives every legislator a professional website on their own domain, a growing list of supporters, an inbox for constituents and email
              newsletters, all run by your team from one simple portal.
            </p>
            <div className="mk-hero__ctas">
              <Link href="#demo" className="mk-btn mk-btn--gold">Request a demo</Link>
              <Link href="#features" className="mk-btn mk-btn--outline">See how it works</Link>
            </div>
            <p className="mk-hero__note">Live in about a week · Your domain · Your data</p>
          </div>
          <div className="mk-hero__art">
            <SiteMock />
            <div className="mk-float mk-float--stat" aria-hidden="true"><small>Supporters</small><b>4,812</b><em>▲ 18% this month</em></div>
            <div className="mk-float mk-float--msg" aria-hidden="true"><small>New message · Nkpor ward</small><b>“Thank you for the new classroom block…”</b></div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mk-section mk-why">
        <div className="mk-wrap">
          <p className="mk-eyebrow">Why Civiq</p>
          <h2 className="mk-h2">Social media is rented. Your platform is yours.</h2>
          <div className="mk-why__grid">
            <div className="mk-card">
              <b className="mk-num">01</b>
              <h3>Own your story</h3>
              <p>One official home for your record, agenda and news, on your own name, that no algorithm can bury.</p>
            </div>
            <div className="mk-card">
              <b className="mk-num">02</b>
              <h3>Know your people</h3>
              <p>Build a list of supporters by ward and interest, with their permission, that grows with every visit.</p>
            </div>
            <div className="mk-card">
              <b className="mk-num">03</b>
              <h3>Stay in touch</h3>
              <p>Answer constituents and send regular updates straight to their inbox, between elections as well as during them.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mk-section mk-steps-wrap">
        <div className="mk-wrap">
          <p className="mk-eyebrow">How it works</p>
          <h2 className="mk-h2">Three steps to launch</h2>
          <ol className="mk-steps">
            <li><b>1</b><h3>Choose your chamber</h3><p>Senate or House of Representatives. Each has its own official theme.</p></li>
            <li><b>2</b><h3>We set it up</h3><p>Send us your photos and content. We build the site, connect your domain and train your team.</p></li>
            <li><b>3</b><h3>Your team runs it</h3><p>Post news, reply to constituents and send newsletters from the Civiq Portal.</p></li>
          </ol>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mk-section mk-features">
        <div className="mk-wrap">
          <p className="mk-eyebrow">Features</p>
          <h2 className="mk-h2">Everything your office needs to stay connected</h2>
          {FEATURES.map(({ id, eyebrow, title, text, points, Mock }, i) => (
            <article key={id} className={`mk-feature${i % 2 ? ' mk-feature--flip' : ''}`}>
              <div className="mk-feature__text">
                <p className="mk-eyebrow">{eyebrow}</p>
                <h3>{title}</h3>
                <p>{text}</p>
                <ul className="mk-ticks">{points.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              <div className="mk-feature__art"><Mock /></div>
            </article>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section id="templates" className="mk-section mk-templates">
        <div className="mk-wrap">
          <p className="mk-eyebrow">Templates</p>
          <h2 className="mk-h2">One for each chamber</h2>
          <p className="mk-sub">Inspired by the two chambers of the National Assembly. Identical features, each with its own official colours.</p>
          <div className="mk-templates__grid">
            <figure>
              <SiteMock chamber="senate" domain="kabirbello.ng" name="Sen. Kabir Bello" badge="Senator, Federal Republic of Nigeria" />
              <figcaption><b>Senate</b> · deep red and gold</figcaption>
            </figure>
            <figure>
              <SiteMock chamber="reps" />
              <figcaption><b>House of Representatives</b> · deep green and gold</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Showcase */}
      {showcase.length > 0 && (
        <section id="showcase" className="mk-section mk-showcase">
          <div className="mk-wrap">
            <p className="mk-eyebrow">On Civiq</p>
            <h2 className="mk-h2">Legislators already using Civiq</h2>
            <ul className="mk-showcase__grid">
              {showcase.map((s) => (
                <li key={s.id}>
                  <a href={`https://${s.domain}`} target="_blank" rel="noopener" className="mk-card mk-person" style={{ ['--b' as string]: s.chamber.brand }}>
                    <span className="mk-person__img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {s.portrait ? <img src={s.portrait} alt="" loading="lazy" /> : <b>{s.name.replace(/^(Hon\.|Sen\.)\s*/, '').split(' ').map((w) => w[0]).join('').slice(0, 2)}</b>}
                    </span>
                    <span className="mk-person__text">
                      <b>{s.name}</b>
                      <small>{s.chamber.label}{s.place ? ` · ${s.place}` : ''}</small>
                      <em>{s.domain} ↗</em>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Trust */}
      <section id="trust" className="mk-section mk-trust">
        <div className="mk-wrap">
          <p className="mk-eyebrow mk-eyebrow--light">Trust and data protection</p>
          <h2 className="mk-h2">Built to protect your constituents’ data, and your reputation</h2>
          <div className="mk-trust__grid">
            <div><h3>Nigeria Data Protection Act</h3><p>Consent is recorded with every sign-up and message, every site has a privacy notice, and every newsletter has a one-click unsubscribe.</p></div>
            <div><h3>Your data stays yours</h3><p>Your office is the data controller; Civiq processes data only on your behalf. Download your supporters whenever you like.</p></div>
            <div><h3>Kept separate</h3><p>Every record belongs to one legislator. Teams only ever see their own office, and public websites are fenced off by the database itself.</p></div>
            <div><h3>Secure access</h3><p>Personal logins for each team member, accounts locked after repeated wrong passwords, and sessions that expire automatically.</p></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mk-section">
        <div className="mk-wrap mk-faq">
          <div>
            <p className="mk-eyebrow">FAQ</p>
            <h2 className="mk-h2">Questions offices ask us</h2>
          </div>
          <div>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="mk-section mk-demo">
        <div className="mk-wrap mk-demo__grid">
          <div>
            <p className="mk-eyebrow mk-eyebrow--light">Request a demo</p>
            <h2 className="mk-h2">See your platform before you decide</h2>
            <p className="mk-lead">Tell us who you are and we’ll show you a live walkthrough, with your chamber’s template, in 30 minutes.</p>
            <ul className="mk-ticks mk-ticks--light">
              <li>No commitment</li>
              <li>In person or online</li>
              <li>Plans to suit every office</li>
            </ul>
            {whatsapp && (
              <a className="mk-btn mk-btn--outline" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">Prefer WhatsApp? Chat with us</a>
            )}
          </div>
          <div className="mk-card mk-demo__form">
            <DemoForm action={submitLead} consentText={leadConsentText} roles={LEAD_ROLES} chambers={CHAMBER_OPTIONS} whatsapp={whatsapp} />
          </div>
        </div>
      </section>
    </>
  )
}
