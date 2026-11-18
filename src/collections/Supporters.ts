import type { CollectionConfig } from 'payload'

import { guardTenantWrite, tenantRole } from '../access'
import { csvExportEndpoint } from '../lib/csv'

export const SUPPORTER_INTERESTS = [
  'Volunteering',
  'Youth programmes',
  'Women’s programmes',
  'Education',
  'Health',
  'Agriculture',
  'Jobs & empowerment',
  'Infrastructure',
  'Events & town halls',
]

export const CONTACT_CHANNELS = ['WhatsApp', 'SMS', 'Email', 'Phone call']

const CSV_COLUMNS = ['createdAt', 'name', 'phone', 'email', 'ward', 'lga', 'state', 'interests', 'channels', 'status', 'consentAt', 'notes'] as const

// The legislator's community: people who joined through "Join the movement" on their site.
// The legislator is the data controller; Civiq stores this on their behalf (data processor).
export const Supporters: CollectionConfig = {
  slug: 'supporters',
  labels: { singular: 'Supporter', plural: 'Supporters' },
  admin: {
    group: 'Community',
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'ward', 'lga', 'status', 'createdAt'],
    description:
      'People who joined the movement on your website, with the consent they gave. Respect unsubscribes, and delete a record when someone asks you to.',
    components: {
      beforeListTable: [{ path: '@/components/admin/ExportButton#ExportButton', clientProps: { collectionSlug: 'supporters' } }],
    },
  },
  defaultSort: '-createdAt',
  access: {
    // Supporters are only created by the website's join form (server-side), never through the API.
    create: () => false,
    read: tenantRole('admin', 'editor'),
    update: tenantRole('admin', 'editor'),
    delete: tenantRole('admin'),
  },
  hooks: {
    beforeChange: [
      guardTenantWrite(['admin', 'editor']),
      ({ data, originalDoc }) => {
        // Record when someone stops receiving messages.
        if (data?.status === 'unsubscribed' && originalDoc?.status !== 'unsubscribed') data.unsubscribedAt = new Date().toISOString()
        if (data?.status === 'subscribed') data.unsubscribedAt = null
        return data
      },
    ],
  },
  endpoints: [csvExportEndpoint('supporters', CSV_COLUMNS, 'supporters')],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
        { name: 'phone', label: 'Phone / WhatsApp', type: 'text', index: true, admin: { readOnly: true } },
        { name: 'email', type: 'email', index: true, admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'ward', type: 'text', admin: { readOnly: true } },
        { name: 'lga', label: 'LGA', type: 'text', admin: { readOnly: true } },
        { name: 'state', type: 'text', admin: { readOnly: true } },
      ],
    },
    { name: 'interests', type: 'select', hasMany: true, options: SUPPORTER_INTERESTS, admin: { readOnly: true } },
    { name: 'channels', label: 'Preferred contact', type: 'select', hasMany: true, options: CONTACT_CHANNELS, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'subscribed',
      options: [
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
      admin: { position: 'sidebar', description: 'Set to Unsubscribed when someone asks to stop receiving messages.' },
    },
    { name: 'unsubscribedAt', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'notes', label: 'Internal notes', type: 'textarea', admin: { position: 'sidebar' } },
    {
      type: 'collapsible',
      label: 'Consent record',
      admin: { initCollapsed: true, description: 'What the person agreed to, and when. Kept as evidence of consent.' },
      fields: [
        { name: 'consentAt', label: 'Consent given', type: 'date', required: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'consentText', label: 'Statement they agreed to', type: 'textarea', required: true, admin: { readOnly: true } },
        { name: 'consentSource', label: 'Where', type: 'text', admin: { readOnly: true } },
      ],
    },
  ],
}
