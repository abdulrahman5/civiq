'use client'

import { usePathname } from 'next/navigation'

// "Need help?" in the portal header: opens a new support request that remembers the current page.
export function HelpLink() {
  const path = usePathname() ?? '/admin'
  if (path.startsWith('/admin/collections/support-requests')) return null
  return (
    <a className="cq-help-btn" href={`/admin/collections/support-requests/create?from=${encodeURIComponent(path)}`}>
      Need help?
    </a>
  )
}
