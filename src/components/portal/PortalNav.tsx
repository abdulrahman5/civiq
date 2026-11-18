'use client'

import { usePathname } from 'next/navigation'

// Portal links shown above the collection groups in the side menu.
const LINKS = [
  { href: '/admin', label: 'Home', exact: true },
  { href: '/admin/community', label: 'Community insights', exact: false },
]

export function PortalNav() {
  const path = usePathname()
  return (
    <div className="cq-nav">
      {LINKS.map((l) => {
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
