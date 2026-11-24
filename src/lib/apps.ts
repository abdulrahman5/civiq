// The Civiq Admin (admin.theciviq.com.ng) and the Civiq Portal (portal.theciviq.com.ng) are the same Payload
// app on two addresses. Admin is for the Civiq team only; the Portal is for legislators' teams (and the Civiq
// team when helping one). This file is shared by src/proxy.ts and server code, so it must stay dependency-free.

export const getAdminUrl = () => (process.env.ADMIN_URL || '').replace(/\/$/, '') || null
export const getAdminHost = () => {
  const url = getAdminUrl()
  return url ? new URL(url).hostname : null
}

/** Screens that belong to the Civiq Admin only. */
export const PLATFORM_PATHS = ['/admin/collections/tenants', '/admin/collections/leads', '/admin/globals/civiq-settings']

/** Screens that belong to the Portal only (a legislator's content, community and outreach). */
export const TEAM_PATHS = [
  '/admin/community',
  '/admin/collections/site-settings',
  '/admin/collections/about',
  '/admin/collections/agenda',
  '/admin/collections/news',
  '/admin/collections/projects',
  '/admin/collections/media',
  '/admin/collections/supporters',
  '/admin/collections/audiences',
  '/admin/collections/messages',
  '/admin/collections/newsletters',
]

export const isUnder = (pathname: string, prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const cleanHost = (h: string | null | undefined) => (h ?? '').split(',')[0]!.trim().toLowerCase().replace(/:\d+$/, '')

/** Which app a request is for, from its host: 'admin' on the admin address (or admin.localhost), else 'portal'. */
export const appForHost = (host: string | null | undefined): 'admin' | 'portal' => {
  const h = cleanHost(host)
  return (getAdminHost() && h === getAdminHost()) || h === 'admin.localhost' ? 'admin' : 'portal'
}

/** The request's own host, as the visitor typed it. */
export const requestHost = (headers: { get(name: string): string | null }) => cleanHost(headers.get('x-forwarded-host') || headers.get('host'))
