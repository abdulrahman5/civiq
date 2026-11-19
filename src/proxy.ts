import { type NextRequest, NextResponse } from 'next/server'

import { getRootDomain } from './lib/site-url'

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
  const isAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/')

  if (portalHost && host === portalHost) {
    return isAdmin ? NextResponse.next() : NextResponse.redirect(new URL('/admin', portalUrl))
  }
  if (isAdmin) {
    return portalHost ? NextResponse.redirect(new URL(url.pathname + url.search, portalUrl)) : NextResponse.next()
  }

  // Civiq's own marketing site on the root domain (theciviq.com.ng); www forwards to it.
  // civiq.localhost shows it in local development.
  const root = getRootDomain()
  if (root && host === `www.${root}`) {
    const to = url.clone()
    to.host = root
    to.port = ''
    return NextResponse.redirect(to, 308)
  }
  if ((root && host === root) || host === 'civiq.localhost') {
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
