'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

type NavUser = { platformRole?: string | null; tenants?: { role?: string | null }[] | null } | null
// Contributors only write drafts, so the community screens are not for them (see isOnlyContributor in access.ts).
const isOnlyContributor = (u: NavUser) => Boolean(u) && u!.platformRole !== 'platform-admin' && !(u!.tenants ?? []).some((t) => t.role === 'admin' || t.role === 'editor')

// Portal links shown above the collection groups in the side menu.
const LINKS = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/community', label: 'Community insights', exact: false, community: true },
  { href: '/admin/monitoring', label: 'Site health', exact: false, civiq: true },
]

export function PortalNav() {
  const path = usePathname()
  const { user } = useAuth()
  const contributor = isOnlyContributor(user as NavUser)
  return (
    <div className="cq-nav">
      {LINKS.filter((l) => !(contributor && 'community' in l) && !('civiq' in l && (user as NavUser)?.platformRole !== 'platform-admin')).map((l) => {
        const active = l.exact ? path === l.href : path?.startsWith(l.href)
        return (
          <a key={l.href} href={l.href} className={`nav__link${active ? ' cq-nav--active' : ''}`} aria-current={active ? 'page' : undefined}>
            {active && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{l.label}</span>
          </a>
        )
      })}
    </div>
  )
}
