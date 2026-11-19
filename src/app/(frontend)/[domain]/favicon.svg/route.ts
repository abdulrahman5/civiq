import { themeOf } from '@/lib/themes'
import { loadSite } from '../site'

export const dynamic = 'force-static'
export const generateStaticParams = () => []

// Browser-tab icon generated from each site's template colour and short name.
export async function GET(_req: Request, { params }: { params: Promise<{ domain: string }> }) {
  const { tenant, settings: s } = await loadSite((await params).domain)
  const label = (s.shortName || '').slice(0, 4).replace(/[<>&"']/g, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${themeOf(tenant).brand}"/><text x="32" y="41" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })
}
