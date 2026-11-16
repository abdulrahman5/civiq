import { getNews } from '@/lib/payload'
import { isIndexable } from '@/lib/tenant'
import { loadSite } from '../site'

export const dynamic = 'force-static'
export const generateStaticParams = () => []

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

// Each legislator's site has its own sitemap on its own domain.
export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { tenant, domain, siteUrl } = await loadSite((await params).domain)
  const posts = isIndexable(tenant, domain) ? await getNews(tenant.id) : []
  const urls = [`${siteUrl}/`, `${siteUrl}/news`, ...posts.map((p) => `${siteUrl}/news/${p.slug}`)]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${esc(u)}</loc></url>`)
    .join('\n')}\n</urlset>\n`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
}
