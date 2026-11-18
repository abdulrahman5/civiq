'use client'

import { useSearchParams } from 'next/navigation'

const TABS = [
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
] as const

export function InboxTabLinks({ counts }: { counts: Record<string, number> | null }) {
  const params = useSearchParams()
  const current = params.get('where[status][equals]') ?? 'all'
  return (
    <nav className="cq-tabs" aria-label="Filter messages">
      {TABS.map((t) => {
        const href = t.key === 'all' ? '/admin/collections/messages' : `/admin/collections/messages?where[status][equals]=${t.key}`
        const active = current === t.key
        return (
          <a key={t.key} href={href} className={`cq-tab${active ? ' cq-tab--active' : ''}`} aria-current={active ? 'page' : undefined}>
            {t.label}
            {counts && counts[t.key] !== undefined && <span className="cq-tab__count">{counts[t.key]}</span>}
          </a>
        )
      })}
    </nav>
  )
}
