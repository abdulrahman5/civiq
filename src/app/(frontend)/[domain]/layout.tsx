import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { absoluteUrl, hex, imageUrl } from '@/lib/payload'
import { isIndexable } from '@/lib/tenant'
import { MobileNav } from './MobileNav'
import { type DomainParams, siteFromParams } from './site'

// Each legislator's site is rendered on first visit and then cached until their team saves a change.
export const dynamic = 'force-static'
export const generateStaticParams = () => []

export async function generateMetadata(props: DomainParams): Promise<Metadata> {
  const { tenant, settings: s, domain, siteUrl } = await siteFromParams(props)
  const title = `${s.name} | ${s.constituency ?? ''}`.replace(/ \| $/, '')
  const image = absoluteUrl(siteUrl, imageUrl(s.shareImage, 'large') || imageUrl(s.hero?.image, 'large'))
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${s.name}` },
    // Points www. and other extra domains at the main domain.
    alternates: { canonical: '/' },
    description: s.seoDescription ?? undefined,
    icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
    openGraph: { type: 'website', title, description: s.seoDescription ?? undefined, siteName: s.name, images: image ? [image] : undefined },
    twitter: { card: 'summary_large_image' },
    robots: isIndexable(tenant, domain) ? undefined : { index: false, follow: false },
  }
}

export async function generateViewport(props: DomainParams): Promise<Viewport> {
  const { settings } = await siteFromParams(props)
  return { themeColor: hex(settings.primaryColor, '#0b5d3b') }
}

const SOCIALS = [
  ['facebook', 'Facebook', 'f'],
  ['x', 'X / Twitter', '𝕏'],
  ['instagram', 'Instagram', '◎'],
  ['youtube', 'YouTube', '▶'],
  ['tiktok', 'TikTok', '♪'],
] as const

export default async function SiteLayout(props: DomainParams & { children: ReactNode }) {
  const { settings: s } = await siteFromParams(props)
  const brand = hex(s.primaryColor, '#0b5d3b')
  const accent = hex(s.accentColor, '#c8a13a')
  const socials = SOCIALS.filter(([k]) => s.socials?.[k])

  return (
    <>
      <style>{`:root{--brand:${brand};--accent:${accent}}`}</style>
      <header>
        <div className="wrap nav">
          <Link href="/" className="logo">
            <span className="logo-mark">{s.shortName}</span>
            <span>
              {s.name}
              <small>{s.constituency}</small>
            </span>
          </Link>
          <MobileNav>
            <li><Link href="/#about">About</Link></li>
            <li><Link href="/#agenda">Agenda</Link></li>
            <li><Link href="/#journey">Journey</Link></li>
            <li><Link href="/#projects">Projects</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/#involve">Contact</Link></li>
            <li><Link href="/#join" className="btn btn-green">Join the movement</Link></li>
          </MobileNav>
        </div>
      </header>
      <main>{props.children}</main>
      <footer>
        <div className="wrap">
          <div className="foot">
            <Link href="/" className="logo">
              <span className="logo-mark">{s.shortName}</span>
              <span>
                {s.name}
                <small>{[s.hero?.headline, s.hero?.highlight].filter(Boolean).join(' ')}</small>
              </span>
            </Link>
            {socials.length > 0 && (
              <div className="socials">
                {socials.map(([k, label, glyph]) => (
                  <a key={k} href={s.socials![k]!} aria-label={label} target="_blank" rel="noopener noreferrer">{glyph}</a>
                ))}
              </div>
            )}
          </div>
          <div className="copy">
            © {new Date().getFullYear()} Office of {s.name}. All rights reserved. · <Link href="/privacy">Privacy notice</Link>
            <span className="powered"> · Powered by <a href="https://civiq.ng" target="_blank" rel="noopener">Civiq</a></span>
          </div>
        </div>
      </footer>
    </>
  )
}
