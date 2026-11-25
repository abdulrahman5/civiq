'use client'

import { useAuth, useNav, usePreferences } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

type NavUser = { platformRole?: string | null; tenants?: { role?: string | null }[] | null } | null
// Contributors only write drafts, so the community screens are not for them (see isOnlyContributor in access.ts).
const isOnlyContributor = (u: NavUser) => Boolean(u) && u!.platformRole !== 'platform-admin' && !(u!.tenants ?? []).some((t) => t.role === 'admin' || t.role === 'editor')

// Portal links shown above the collection groups in the side menu.
const LINKS = [
  { href: '/admin', label: 'Home', exact: true, icon: 'home' },
  { href: '/admin/community', label: 'Community insights', exact: false, community: true, icon: 'chart' },
  { href: '/admin/monitoring', label: 'Site health', exact: false, civiq: true, icon: 'activity' },
]

export function PortalNav() {
  const path = usePathname()
  const { user } = useAuth()
  const contributor = isOnlyContributor(user as NavUser)
  // Payload only opens the menu by itself on screens wider than 1440 px; most laptops are narrower.
  // Open it on any desktop-width screen unless the person has chosen to close it.
  // The choice to close it is remembered in this browser (Payload does not save it on laptop-size screens).
  const { navOpen, setNavOpen } = useNav()
  const { getPreference } = usePreferences()
  const decided = useRef(false)
  useEffect(() => {
    let closedByUser = false
    try {
      closedByUser = localStorage.getItem('cq-nav-closed') === '1'
    } catch {}
    if (window.innerWidth <= 1024 || closedByUser) {
      decided.current = true
      return
    }
    getPreference<{ open?: boolean }>('nav').then((p) => {
      if (typeof p?.open !== 'boolean') setNavOpen(true)
      decided.current = true
    })
  }, [getPreference, setNavOpen])
  useEffect(() => {
    if (!decided.current || window.innerWidth <= 1024) return
    try {
      if (navOpen) localStorage.removeItem('cq-nav-closed')
      else localStorage.setItem('cq-nav-closed', '1')
    } catch {}
  }, [navOpen])
  return (
    <div className="cq-nav">
      {LINKS.filter((l) => !(contributor && 'community' in l) && !('civiq' in l && (user as NavUser)?.platformRole !== 'platform-admin')).map((l) => {
        const active = l.exact ? path === l.href : path?.startsWith(l.href)
        return (
          <a key={l.href} href={l.href} className={`nav__link cq-ico-${l.icon}${active ? ' cq-nav--active' : ''}`} aria-current={active ? 'page' : undefined}>
            {active && <div className="nav__link-indicator" />}
            <span className="nav__link-label">{l.label}</span>
          </a>
        )
      })}
    </div>
  )
}
