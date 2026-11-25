import type { CollectionConfig, FieldAccess } from 'payload'

import { guardTenantWrite, isPlatformAdmin, platformAdminOnly, tenantRole } from '../access'
import { notifyOnSupportChange, supportReplyEndpoint } from '../lib/support'

export const SUPPORT_TYPES = [
  { label: 'Something isn’t working', value: 'issue' },
  { label: 'Request a change or feature', value: 'request' },
  { label: 'Question / how do I…', value: 'question' },
  { label: 'Feedback', value: 'feedback' },
]
export const SUPPORT_STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Waiting on office', value: 'waiting' },
  { label: 'Resolved', value: 'resolved' },
]

const civiqOnly: FieldAccess = ({ req }) => isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0])
const nobody: FieldAccess = () => false

// Issues, requests, questions and feedback from legislators' teams to the Civiq team. Teams submit and follow
// their office's requests in the Portal; the Civiq team triages, replies and resolves them in the Civiq Admin.
// Replies go through POST /api/support-requests/:id/reply so both sides are emailed.
export const SupportRequests: CollectionConfig = {
  slug: 'support-requests',
  labels: { singular: 'Support request', plural: 'Support requests' },
  admin: {
    group: 'Help & support',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'type', 'priority', 'status', 'tenant', 'lastActivityAt'],
    description: 'Report a problem, ask a question, request a change or share feedback with the Civiq team. You will be emailed when we reply.',
  },
  defaultSort: '-lastActivityAt',
  access: {
    read: tenantRole('admin', 'editor', 'contributor'),
    create: tenantRole('admin', 'editor', 'contributor'),
    update: platformAdminOnly, // teams reply through the reply endpoint, never by editing
    delete: platformAdminOnly,
  },
  hooks: {
    beforeChange: [
      guardTenantWrite(['admin', 'editor', 'contributor']),
      ({ data, req, operation }) => {
        if (operation === 'create') {
          const user = req.user as { id: number; name?: string; email?: string } | null
          if (user) {
            data.submittedBy = user.id
            data.submittedByName = user.name || user.email
          }
          // The page they were on: "Need help?" opens the form with ?from=<path>, which the browser sends back
          // as the referrer of this save.
          if (!data.pageUrl) {
            try {
              const from = new URL(req.headers.get('referer') ?? '').searchParams.get('from')
              if (from && from.startsWith('/')) data.pageUrl = from.slice(0, 300)
            } catch {
              // no referrer: leave it empty
            }
          }
          // Set by the server, whatever the browser sent.
          data.status = 'new'
          data.messages = []
          data.lastActivityAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [notifyOnSupportChange],
  },
  endpoints: [supportReplyEndpoint],
  fields: [
    { name: 'pageCapture', type: 'ui', admin: { components: { Field: '@/components/portal/SupportPageCapture#SupportPageCapture' }, disableListColumn: true } },
    {
      type: 'row',
      fields: [
        { name: 'type', label: 'What is this about?', type: 'select', required: true, defaultValue: 'issue', options: SUPPORT_TYPES },
        {
          name: 'priority',
          type: 'select',
          required: true,
          defaultValue: 'normal',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Urgent: the website is down or showing wrong information', value: 'urgent' },
          ],
          admin: { components: { Cell: '@/components/portal/StatusCell#StatusCell' } },
        },
      ],
    },
    { name: 'subject', type: 'text', required: true, maxLength: 150 },
    {
      name: 'description',
      label: 'Details',
      type: 'textarea',
      required: true,
      maxLength: 5000,
      admin: { description: 'What happened, what you expected, and the steps to see it. For a change, describe what you need and why.' },
    },
    {
      name: 'attachments',
      label: 'Screenshots or files',
      type: 'upload',
      relationTo: 'support-files',
      hasMany: true,
      maxRows: 5,
      admin: { description: 'Optional. Images or PDFs, up to 5. Only your team and the Civiq team can see them.' },
    },
    { name: 'pageUrl', label: 'Page you were on', type: 'text', admin: { readOnly: true, condition: (data) => Boolean(data?.pageUrl) } },
    // The conversation with the Civiq team, and the reply box.
    { name: 'thread', type: 'ui', admin: { components: { Field: '@/components/portal/SupportThread#SupportThread' }, disableListColumn: true } },
    {
      name: 'messages',
      type: 'array',
      admin: { hidden: true, readOnly: true },
      access: { update: nobody },
      fields: [
        { name: 'at', type: 'date', required: true },
        { name: 'authorName', type: 'text' },
        { name: 'fromCiviq', type: 'checkbox', defaultValue: false },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    // Sidebar
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: SUPPORT_STATUSES,
      admin: { components: { Cell: '@/components/portal/StatusCell#StatusCell' }, position: 'sidebar', description: 'Set by the Civiq team.', condition: (data) => Boolean(data?.id) },
      access: { update: civiqOnly },
    },
    {
      name: 'assignee',
      label: 'Assigned to (Civiq)',
      type: 'relationship',
      relationTo: 'users',
      filterOptions: { platformRole: { equals: 'platform-admin' } },
      admin: { position: 'sidebar' },
      access: { read: civiqOnly, create: civiqOnly, update: civiqOnly },
    },
    {
      name: 'internalNotes',
      label: 'Internal notes (Civiq only)',
      type: 'textarea',
      admin: { position: 'sidebar', description: 'Never shown to the legislator’s team.' },
      access: { read: civiqOnly, create: civiqOnly, update: civiqOnly },
    },
    { name: 'submittedBy', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar', readOnly: true, condition: (data) => Boolean(data?.id) }, access: { update: nobody } },
    { name: 'submittedByName', label: 'Submitted by', type: 'text', admin: { hidden: true }, access: { update: nobody } },
    {
      name: 'lastActivityAt',
      label: 'Last activity',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' }, condition: (data) => Boolean(data?.id) },
      access: { update: nobody },
    },
  ],
}
