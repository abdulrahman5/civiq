import type { CollectionConfig } from 'payload'

import { isPlatformAdmin, platformAdminOnly } from '../access'
import { createSiteFromLeadEndpoint } from '../lib/leads'
import { CHAMBER_OPTIONS } from '../lib/themes'

export const LEAD_ROLES = ['Legislator', 'Chief of staff', 'Media aide', 'Other office staff', 'Party or caucus', 'Other'] as const
export const LEAD_STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Demo booked', value: 'demo-booked' },
  { label: 'Signed', value: 'signed' },
  { label: 'Not now', value: 'not-now' },
] as const

// Demo requests from the Civiq marketing site (theciviq.com.ng). Civiq's own sales pipeline, so only
// the Civiq team sees it. Leads are created only by the site's form (server-side), never through the API.
export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Lead', plural: 'Leads' },
  admin: {
    group: 'Civiq platform',
    useAsTitle: 'name',
    defaultColumns: ['name', 'legislatorName', 'chamber', 'status', 'createdAt'],
    description: 'Demo requests from theciviq.com.ng. When one signs, open it and use “Create legislator site”.',
    hidden: ({ user }) => !isPlatformAdmin(user as Parameters<typeof isPlatformAdmin>[0]),
  },
  defaultSort: '-createdAt',
  access: {
    create: () => false,
    read: platformAdminOnly,
    update: platformAdminOnly,
    delete: platformAdminOnly,
  },
  endpoints: [createSiteFromLeadEndpoint],
  fields: [
    { name: 'createSite', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/components/portal/LeadToSite#LeadToSite' }, disableListColumn: true } },
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
        { name: 'role', type: 'select', options: [...LEAD_ROLES], admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', label: 'Phone / WhatsApp', type: 'text', admin: { readOnly: true } },
        { name: 'email', type: 'email', admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'legislatorName', label: 'Legislator', type: 'text', admin: { readOnly: true } },
        { name: 'chamber', type: 'select', options: [...CHAMBER_OPTIONS, { label: 'Not sure yet', value: 'unsure' }], admin: { readOnly: true } },
        { name: 'constituency', label: 'Constituency / state', type: 'text', admin: { readOnly: true } },
      ],
    },
    { name: 'message', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [...LEAD_STATUSES],
      admin: { position: 'sidebar' },
    },
    { name: 'notes', label: 'Internal notes', type: 'textarea', admin: { position: 'sidebar' } },
    { name: 'site', label: 'Legislator site', type: 'relationship', relationTo: 'tenants', admin: { position: 'sidebar', readOnly: true } },
    {
      type: 'collapsible',
      label: 'Consent record',
      admin: { initCollapsed: true },
      fields: [
        { name: 'consentAt', label: 'Consent given', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'consentText', label: 'Statement they agreed to', type: 'textarea', admin: { readOnly: true } },
        { name: 'source', label: 'Page', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
