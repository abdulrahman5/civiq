import { headers } from 'next/headers'

import { appForHost, getAdminUrl, requestHost } from '@/lib/apps'

// Shows each address only its own menus: the Civiq Admin hides a legislator's screens (Website, Community,
// Outreach, Community insights, the Legislator menu); the Portal hides "Civiq platform" once the Admin has its
// own address. The pages themselves are redirected by src/proxy.ts; this keeps the menu tidy, rendered on the
// server so nothing flashes.
const ADMIN_HIDES = ['[id="nav-group-Website"]', '[id="nav-group-Community"]', '[id="nav-group-Outreach"]', '.cq-nav a[href="/admin/community"]', '.nav .tenant-selector']
const PORTAL_HIDES = ['[id="nav-group-Civiq platform"]']

export async function NavScope() {
  const app = appForHost(requestHost(await headers()))
  const hide = app === 'admin' ? ADMIN_HIDES : getAdminUrl() ? PORTAL_HIDES : []
  return hide.length ? <style>{`${hide.join(', ')} { display: none !important; }`}</style> : null
}
