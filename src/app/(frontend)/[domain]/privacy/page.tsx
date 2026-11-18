import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { isPlaceholder } from '@/lib/payload'
import { type DomainParams, siteFromParams } from '../site'

export const dynamic = 'force-static'

// The date the standard notice below was last changed. Update it whenever the wording changes.
const STANDARD_NOTICE_UPDATED = '18 November 2026'

export async function generateMetadata(props: DomainParams): Promise<Metadata> {
  const { settings: s } = await siteFromParams(props)
  return { title: 'Privacy notice', description: `How the office of ${s.name} collects and uses personal information.`, alternates: { canonical: '/privacy' } }
}

export default async function PrivacyPage(props: DomainParams) {
  const { settings: s } = await siteFromParams(props)
  const office = `the office of ${s.name}`
  const email = [s.privacyEmail, s.contact?.email].find((e) => e && !isPlaceholder(e)) ?? null

  return (
    <article className="article prose-page">
      <Link className="back" href="/">← Back to the home page</Link>
      <h1>Privacy notice</h1>
      {s.privacyPolicy ? (
        <RichText data={s.privacyPolicy} className="prose" />
      ) : (
        <div className="prose">
          <p><time>Last updated {STANDARD_NOTICE_UPDATED}</time></p>
          <p>
            This notice explains how {office} (“we”) collects and uses personal information through this website, in line with the
            Nigeria Data Protection Act 2023.
          </p>

          <h2>Who is responsible for your information</h2>
          <p>
            <b>The office of {s.name}</b> is the <b>data controller</b> for information you give on this website. The website runs on
            Civiq, a platform that stores and processes the information <b>on our behalf and only on our instructions</b> (a data processor).
          </p>

          <h2>What we collect</h2>
          <ul>
            <li><b>Join the movement:</b> your name, phone or WhatsApp number, email address (optional), ward, LGA and state, the topics you are interested in and how you would like to be contacted.</li>
            <li><b>Contact form:</b> your name, email, phone (optional), ward or community, the topic and your message.</li>
            <li><b>Evidence of your consent:</b> the statement you agreed to and when you agreed to it.</li>
            <li><b>Technical information:</b> our hosting provider keeps short-lived server logs (such as IP addresses) for security, and the site’s fonts are loaded from Google Fonts, so your browser connects to Google. This site does not use advertising or tracking cookies.</li>
          </ul>

          <h2>Why we use it, and on what basis</h2>
          <p>
            We use your information to respond to your messages, to keep you informed about our work, events and opportunities, to organise
            volunteers, and to understand the needs of our constituents. We do this <b>with your consent</b>, which you give by ticking the box
            on each form. You can withdraw your consent at any time.
          </p>

          <h2>Who we share it with</h2>
          <p>
            We do not sell your information or share it with other politicians or parties. It is stored by Civiq and its service providers,
            which host the website and database and send emails for us. Some of these providers keep data in data centres outside Nigeria;
            where they do, we rely on the safeguards the Nigeria Data Protection Act requires. We may disclose information where the law requires it.
          </p>

          <h2>How long we keep it</h2>
          <ul>
            <li>Supporter details: until you unsubscribe or ask us to delete them.</li>
            <li>Messages: for up to 24 months after we have dealt with them, unless the law requires longer.</li>
          </ul>

          <h2>Your rights</h2>
          <p>
            You can ask us to tell you what information we hold about you and give you a copy, correct it, delete it, or stop using it; and you
            can withdraw your consent or unsubscribe at any time. If you are not satisfied with our response, you can complain to the Nigeria
            Data Protection Commission (NDPC).
          </p>

          <h2>Contact us</h2>
          <p>
            {email ? (
              <>To make a request or ask a question about this notice, email <a href={`mailto:${email}`}>{email}</a>.</>
            ) : (
              <>To make a request or ask a question about this notice, contact the office using the details on the <Link href="/#involve">home page</Link>.</>
            )}
          </p>
        </div>
      )}
    </article>
  )
}
