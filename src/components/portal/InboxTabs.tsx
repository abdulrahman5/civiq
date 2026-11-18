import type { Payload } from 'payload'

import { inboxCounts } from '@/lib/insights'
import { getPortalContext } from './context'
import { InboxTabLinks } from './InboxTabLinks'

// Above the Inbox list: Unread · Read · Archived · All, with counts for the selected legislator.
export async function InboxTabs({ payload, user }: { payload?: Payload; user?: unknown }) {
  let counts: Record<string, number> | null = null
  if (payload && user) {
    const ctx = await getPortalContext(payload, user)
    if (ctx.tenant && ctx.canSeeCommunity) counts = await inboxCounts(payload, ctx.tenant.id)
  }
  return <InboxTabLinks counts={counts} />
}
