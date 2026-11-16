import { isIndexable } from '@/lib/tenant'
import { loadSite } from '../site'

export const dynamic = 'force-static'
export const generateStaticParams = () => []

// Search engines may index a site only on its main domain; previews and vercel.app addresses stay hidden.
export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { tenant, domain, siteUrl } = await loadSite((await params).domain)
  const body = isIndexable(tenant, domain)
    ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n'
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
}
