import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { getCiviqSettings } from '@/lib/marketing'
import { getPortalUrl, getRootDomain } from '@/lib/site-url'
import './marketing.css'

// Civiq's own website (theciviq.com.ng). src/proxy.ts sends the root domain here (as /civiq/…).
const siteUrl = () => (getRootDomain() ? `https://${getRootDomain()}` : 'http://civiq.localhost:3000')

// Built per request (not at build time), so it always uses the live PLATFORM_ROOT_DOMAIN.
export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(siteUrl()),
  title: { default: 'Civiq | Digital platforms for Nigerian legislators', template: '%s | Civiq' },
  description:
    'Civiq gives Senators and Members of the House of Representatives their own website, supporter list, constituent inbox and email newsletters, run by their team from one simple portal.',
  icons: { icon: { url: '/civiq-mark.svg', type: 'image/svg+xml' } },
  openGraph: { type: 'website', siteName: 'Civiq', url: '/' },
  twitter: { card: 'summary' },
  alternates: { canonical: '/' },
})

export const viewport: Viewport = { themeColor: '#0b5d3b' }

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const settings = await getCiviqSettings()
  const portal = `${getPortalUrl()}/admin`
  const whatsapp = settings?.whatsapp?.replace(/[^\d]/g, '')

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" />
      </head>
      <body className="mk">
        <a className="mk-skip" href="#main">Skip to content</a>
        <header className="mk-header">
          <div className="mk-wrap mk-nav">
            <Link href="/" className="mk-logo" aria-label="Civiq home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/civiq-mark.svg" alt="" width={34} height={34} />
              <span>Civiq</span>
            </Link>
            <nav aria-label="Main">
              <ul className="mk-menu">
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#templates">Templates</Link></li>
                <li><Link href="/#trust">Trust</Link></li>
                <li><Link href="/#faq">FAQ</Link></li>
              </ul>
            </nav>
            <div className="mk-nav__cta">
              <a href={portal} className="mk-link">Log in</a>
              <Link href="/#demo" className="mk-btn mk-btn--gold mk-btn--sm">Request a demo</Link>
            </div>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="mk-footer">
          <div className="mk-wrap mk-footer__grid">
            <div>
              <Link href="/" className="mk-logo mk-logo--light">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/civiq-mark.svg" alt="" width={30} height={30} />
                <span>Civiq</span>
              </Link>
              <p>Digital platforms for Nigerian legislators. Built in Nigeria, for the National Assembly.</p>
            </div>
            <div>
              <h2>Product</h2>
              <ul>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#templates">Templates</Link></li>
                <li><Link href="/#trust">Data protection</Link></li>
                <li><a href={portal}>Log in to the portal</a></li>
              </ul>
            </div>
            <div>
              <h2>Contact</h2>
              <ul>
                <li><Link href="/#demo">Request a demo</Link></li>
                {settings?.salesEmail && <li><a href={`mailto:${settings.salesEmail}`}>{settings.salesEmail}</a></li>}
                {whatsapp && <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener">WhatsApp</a></li>}
                {settings?.linkedin && <li><a href={settings.linkedin} target="_blank" rel="noopener">LinkedIn</a></li>}
                {settings?.x && <li><a href={settings.x} target="_blank" rel="noopener">X / Twitter</a></li>}
              </ul>
            </div>
            <div>
              <h2>Legal</h2>
              <ul>
                <li><Link href="/privacy">Privacy notice</Link></li>
                <li><Link href="/terms">Terms of use</Link></li>
              </ul>
            </div>
          </div>
          <div className="mk-wrap mk-footer__base">© {new Date().getFullYear()} Civiq. All rights reserved.</div>
        </footer>
      </body>
    </html>
  )
}
