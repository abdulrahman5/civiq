import type { CollectionConfig } from 'payload'

import { platformAdminOnly } from '../access'
import { monitoringCronEndpoint, runChecksEndpoint } from '../lib/monitoring'

// One row per uptime check of a legislator's live site: the history behind Site health in the Civiq Admin.
// Written only by the server (scheduled checks and "Check now"); kept for 30 days.
export const SiteChecks: CollectionConfig = {
  slug: 'site-checks',
  labels: { singular: 'Site check', plural: 'Site checks' },
  admin: { hidden: true, useAsTitle: 'url' },
  access: { read: platformAdminOnly, create: () => false, update: () => false, delete: () => false },
  endpoints: [runChecksEndpoint, monitoringCronEndpoint],
  fields: [
    { name: 'site', type: 'relationship', relationTo: 'tenants', required: true, index: true },
    { name: 'url', type: 'text', required: true },
    { name: 'ok', type: 'checkbox', defaultValue: false, index: true },
    { name: 'statusCode', type: 'number' },
    { name: 'responseMs', type: 'number' },
    { name: 'error', type: 'text' },
  ],
}
