import { getRootDomain } from '@/lib/site-url'

export const dynamic = 'force-static'

export function GET() {
  const base = `https://${getRootDomain() || 'theciviq.com.ng'}`
  const urls = ['/', '/privacy', '/terms'].map((p) => `<url><loc>${base}${p === '/' ? '' : p}</loc></url>`).join('')
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
