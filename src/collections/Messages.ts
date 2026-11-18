import type { CollectionConfig } from 'payload'

import { guardTenantWrite, tenantRole } from '../access'
import { csvExportEndpoint } from '../lib/csv'

export const MESSAGE_TOPICS = ['Volunteer', 'Request support', 'Invite to event', 'Share feedback', 'Media enquiry']

const CSV_COLUMNS = ['createdAt', 'name', 'email', 'phone', 'ward', 'topic', 'status', 'message', 'notes', 'consentAt'] as const

export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: 'Message', plural: 'Inbox' },
  admin: {
    group: 'Inbox',
    useAsTitle: 'name',
    defaultColumns: ['name', 'topic', 'ward', 'status', 'createdAt'],
    description: 'Messages sent through the website contact form.',
    components: {
      beforeListTable: [{ path: '@/components/admin/ExportButton#ExportButton', clientProps: { collectionSlug: 'messages' } }],
    },
  },
  defaultSort: '-createdAt',
  access: {
    // Messages are only created by the website's contact form (server-side), never through the API.
    create: () => false,
    read: tenantRole('admin', 'editor'),
    update: tenantRole('admin', 'editor'),
    delete: tenantRole('admin'),
  },
  hooks: {
    beforeChange: [guardTenantWrite(['admin', 'editor'])],
  },
  endpoints: [csvExportEndpoint('messages', CSV_COLUMNS, 'messages')],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true, admin: { readOnly: true } },
        { name: 'email', type: 'email', required: true, admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'phone', type: 'text', admin: { readOnly: true } },
        { name: 'ward', label: 'Ward / community', type: 'text', admin: { readOnly: true } },
        { name: 'topic', type: 'select', options: MESSAGE_TOPICS, admin: { readOnly: true } },
      ],
    },
    { name: 'message', type: 'textarea', admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      required: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'In progress', value: 'in-progress' },
        { label: 'Handled', value: 'handled' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'notes', label: 'Internal notes', type: 'textarea', admin: { position: 'sidebar', description: 'Only visible to admins.' } },
    {
      type: 'collapsible',
      label: 'Consent record',
      admin: { initCollapsed: true },
      fields: [
        { name: 'consentAt', label: 'Consent given', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'consentText', label: 'Statement they agreed to', type: 'textarea', admin: { readOnly: true } },
      ],
    },
  ],
}
