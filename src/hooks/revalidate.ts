import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

// The public site is pre-rendered. Any content change purges the cache so updates show up immediately.
// Every legislator's site is refreshed for now; per-tenant refresh comes with the domain onboarding work.
const refresh = (req: PayloadRequest) => {
  if (req.context?.disableRevalidate) return
  try {
    revalidatePath('/', 'layout')
  } catch (err) {
    // Happens outside a Next.js request, e.g. when running the seed script.
    req.payload.logger.debug({ err }, 'Skipped revalidation')
  }
}

export const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  refresh(req)
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  refresh(req)
  return doc
}
