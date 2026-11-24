import { type NextRequest, NextResponse } from 'next/server'

import { appForHost, getAdminUrl, isUnder, PLATFORM_PATHS, TEAM_PATHS } from './lib/apps'
import { getPortalUrl, getRootDomain } from './lib/site-url'

// Every legislator's site is served by this one app. The proxy reads the domain a request came
// in on and rewrites it to /<domain>/<path>, where [domain] pages look up that legislator's content.
// The portal (/admin) lives on one Civiq address: once PORTAL_URL is set, /admin on any
// legislator's domain redirects there, and the portal's own host only serves the portal.
export function proxy(request: NextRequest) {
  const url = request.nextUrl
  const host = (request.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '')
  if (!/^[a-z0-9.-]{1,253}$/.test(host)) return new NextResponse('Bad request', { status: 400 })

  const portalUrl = process.env.PORTAL_URL || process.env.CONSOLE_URL
  const portalHost = portalUrl ? new URL(portalUrl).hostname : null
  const adminUrl = getAdminUrl()
  const isAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/')
  // Sent as a full address on purpose: Next.js shortens a redirect it thinks is same-origin to a bare path,
  // which would keep the browser on the address it came from.
  const to = (base: string) => new NextResponse(null, { status: 307, headers: { Location: new URL(url.pathname + url.search, base).toString() } })

  // The Civiq Admin: only the Civiq team's screens. A legislator's screens open in the Portal.
  if (appForHost(host) === 'admin') {
    if (!isAdmin) return NextResponse.redirect(new URL('/admin', url))
    if (isUnder(url.pathname, TEAM_PATHS)) return to(getPortalUrl())
    return NextResponse.next()
  }
  // The Portal: the Civiq platform screens live in the Admin once it has its own address.
  if (isAdmin && adminUrl && isUnder(url.pathname, PLATFORM_PATHS)) return to(adminUrl)
  // "Open in portal" from the Admin: pick that legislator in the Portal's Legislator menu, then show Home.
  if (url.pathname === '/admin' && /^\d+$/.test(url.searchParams.get('legislator') ?? '')) {
    const res = NextResponse.redirect(new URL('/admin', url))
    res.cookies.set('payload-tenant', url.searchParams.get('legislator')!, { path: '/', sameSite: 'lax' })
    return res
  }

  if (portalHost && host === portalHost) {
    return isAdmin ? NextResponse.next() : NextResponse.redirect(new URL('/admin', portalUrl))
  }
  if (isAdmin) {
    return portalHost ? NextResponse.redirect(new URL(url.pathname + url.search, portalUrl)) : NextResponse.next()
  }

  // Civiq's own marketing site on the root domain (theciviq.com.ng) and www. Which of the two forwards
  // to the other is left to Vercel's domain settings (a redirect here as well can loop with Vercel's);
  // the pages' canonical links point search engines at the bare domain. civiq.localhost is for local development.
  const root = getRootDomain()
  if ((root && (host === root || host === `www.${root}`)) || host === 'civiq.localhost') {
    const rewritten = url.clone()
    rewritten.pathname = `/civiq${url.pathname === '/' ? '' : url.pathname}`
    return NextResponse.rewrite(rewritten)
  }

  const rewritten = url.clone()
  rewritten.pathname = `/${host}${url.pathname === '/' ? '' : url.pathname}`
  return NextResponse.rewrite(rewritten)
}

export const config = {
  // Everything except Next.js internals, the Payload API and static files in /public.
  matcher: ['/((?!_next/|api/|civiq-mark\\.svg$|marketing/).*)'],
}
