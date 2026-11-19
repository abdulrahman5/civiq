import { getRootDomain } from '@/lib/site-url'

export const dynamic = 'force-dynamic' // reads PLATFORM_ROOT_DOMAIN at request time, not build time

export function GET() {
  const root = getRootDomain()
  const body = root ? `User-agent: *\nAllow: /\nSitemap: https://${root}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
