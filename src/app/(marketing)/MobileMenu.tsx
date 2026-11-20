'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const LINKS = [
  ['/#features', 'Features'],
  ['/#templates', 'Templates'],
  ['/#trust', 'Trust'],
  ['/#faq', 'FAQ'],
] as const

// The menu on phones and small tablets, where the header links don't fit.
export function MobileMenu({ portal }: { portal: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="mk-mobile">
      <button type="button" className="mk-mobile__toggle" aria-expanded={open} aria-controls="mk-mobile-menu" onClick={() => setOpen((o) => !o)}>
        <span className="mk-mobile__bars" aria-hidden="true" />
        <span className="mk-sr">{open ? 'Close menu' : 'Open menu'}</span>
      </button>
      {open && (
        <nav id="mk-mobile-menu" className="mk-mobile__panel" aria-label="Main">
          <ul>
            {LINKS.map(([href, label]) => (
              <li key={href}><Link href={href} onClick={() => setOpen(false)}>{label}</Link></li>
            ))}
            <li><a href={portal}>Log in</a></li>
          </ul>
          <Link href="/#demo" className="mk-btn mk-btn--gold" onClick={() => setOpen(false)}>Request a demo</Link>
        </nav>
      )}
    </div>
  )
}
