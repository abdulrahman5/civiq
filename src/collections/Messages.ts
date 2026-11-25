import type { CollectionConfig } from 'payload'

import { guardTenantWrite, tenantRole } from '../access'
import { csvExportEndpoint } from '../lib/csv'
import { replyEndpoint } from '../lib/inbox'

export const MESSAGE_TOPICS = ['Volunteer', 'Request support', 'Invite to event', 'Share feedback', 'Media enquiry']

const CSV_COLUMNS = ['createdAt', 'name', 'email', 'phone', 'ward', 'topic', 'status', 'lastRepliedAt', 'message', 'notes', 'consentAt'] as const

export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: 'Message', plural: 'Inbox' },
  admin: {
    group: 'Community',
    useAsTitle: 'name',
    defaultColumns: ['name', 'topic', 'ward', 'status', 'lastRepliedAt', 'createdAt'],
    description: 'Messages sent through the website contact form. Open one to read it and reply by email.',
    components: {
      beforeListTable: [
        '@/components/portal/InboxTabs#InboxTabs',
        { path: '@/components/admin/ExportButton#ExportButton', clientProps: { collectionSlug: 'messages' } },
      ],
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
  endpoints: [csvExportEndpoint('messages', CSV_COLUMNS, 'messages'), replyEndpoint],
  fields: [
    // Marks the message as read when someone opens it in the portal.
    { name: 'markRead', type: 'ui', admin: { components: { Field: '@/components/portal/MarkRead#MarkRead' }, disableListColumn: true } },
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
    // Reply by email, with the history of replies sent.
    { name: 'replyBox', type: 'ui', admin: { components: { Field: '@/components/portal/ReplyBox#ReplyBox' }, disableListColumn: true } },
    {
      name: 'replies',
      type: 'array',
      admin: { hidden: true, readOnly: true },
      fields: [
        { name: 'sentAt', type: 'date', required: true },
        { name: 'sentBy', type: 'relationship', relationTo: 'users' },
        { name: 'sentByName', type: 'text' },
        { name: 'to', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'unread',
      required: true,
      options: [
        { label: 'Unread', value: 'unread' },
        { label: 'Read', value: 'read' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: { components: { Cell: '@/components/portal/StatusCell#StatusCell' }, position: 'sidebar', description: 'Archive messages you no longer need in the main list.' },
    },
    { name: 'lastRepliedAt', label: 'Last replied', type: 'date', admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'notes', label: 'Internal notes', type: 'textarea', admin: { position: 'sidebar', description: 'Only visible to the team.' } },
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
