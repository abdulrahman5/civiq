import type { Metadata } from 'next'

import { getCiviqSettings } from '@/lib/marketing'

export const metadata: Metadata = { title: 'Privacy notice', alternates: { canonical: '/privacy' } }
export const revalidate = 3600

export default async function CiviqPrivacy() {
  const settings = await getCiviqSettings()
  const contact = settings?.salesEmail
  return (
    <article className="mk-legal">
      <p className="mk-eyebrow">Civiq</p>
      <h1>Privacy notice</h1>
      <p className="mk-updated">Last updated November 2026</p>

      <p>
        This notice explains how Civiq handles personal data on this website (theciviq.com.ng) and in the Civiq Portal, under the Nigeria Data Protection Act
        2023 (NDPA).
      </p>

      <h2>Two roles</h2>
      <ul>
        <li>
          <b>Civiq as data controller.</b> For this website, demo requests and the accounts of people who log in to the Civiq Portal, Civiq decides how the data
          is used and is responsible for it.
        </li>
        <li>
          <b>Civiq as data processor.</b> Each legislator’s website collects supporters’ and constituents’ details for that legislator’s office. The office is
          the data controller; Civiq stores and processes that data only on the office’s instructions. The privacy notice on each legislator’s site explains
          how that office uses it.
        </li>
      </ul>

      <h2>What we collect when you request a demo</h2>
      <p>
        Your name, role, phone/WhatsApp number and/or email, the legislator and constituency you are asking about, anything you write in the message, and the
        time you gave consent.
      </p>

      <h2>Why we use it</h2>
      <p>
        To reply to your request, arrange and follow up on a demo, and keep a record of our conversations. Our lawful basis is your consent, which you can
        withdraw at any time. We do not sell your data or use it for advertising.
      </p>

      <h2>Portal accounts</h2>
      <p>
        For people on a legislator’s team we hold your name, email, the teams and roles you have, when you were invited and when you last used the portal, so
        we can provide the service securely.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only service providers that run Civiq for us, under contract: cloud hosting, our database provider and our email delivery provider. Some of these may
        store data outside Nigeria; where they do, we rely on the safeguards the NDPA requires.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Demo requests are kept for up to 24 months after our last contact with you, unless your office becomes a Civiq client. Portal accounts are kept while
        you are on a team and deleted when you are removed.
      </p>

      <h2>Cookies</h2>
      <p>This website does not use advertising or tracking cookies. The Civiq Portal uses a cookie to keep you logged in.</p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data, object to how it is used, or withdraw consent
        {contact ? (
          <>
            {' '}by emailing <a href={`mailto:${contact}`}>{contact}</a>
          </>
        ) : (
          ' by contacting us through this website'
        )}
        . You can also complain to the Nigeria Data Protection Commission.
      </p>
    </article>
  )
}
