import type { Access, CollectionConfig } from 'payload'

import { guardTenantWrite, idOf, tenantRole } from '../access'
import { countAudience } from '../lib/insights'
import { newsletterEndpoints } from '../lib/newsletters/endpoints'
import { newsletterStats } from '../lib/newsletters/send'

// Once a newsletter starts sending, its content is locked (status changes only happen server-side).
const LOCKED = ['sending', 'sent']
const whileEditable =
  (base: Access): Access =>
  async (args) => {
    const result = await base(args)
    if (!result) return false
    const notLocked = { status: { not_in: LOCKED } }
    return result === true ? notLocked : { and: [result, notLocked] }
  }

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  labels: { singular: 'Newsletter', plural: 'Newsletters' },
  admin: {
    group: 'Outreach',
    useAsTitle: 'subject',
    defaultColumns: ['subject', 'audience', 'status', 'sentAt', 'updatedAt'],
    description:
      'Email updates to supporters. Write a draft, save it, preview and send yourself a test, then send to everyone or a saved audience.',
  },
  defaultSort: '-updatedAt',
  access: {
    read: tenantRole('admin', 'editor'),
    create: tenantRole('admin', 'editor'),
    update: whileEditable(tenantRole('admin', 'editor')),
    delete: whileEditable(tenantRole('admin')),
  },
  hooks: {
    beforeChange: [guardTenantWrite(['admin', 'editor'])],
  },
  endpoints: newsletterEndpoints,
  fields: [
    { name: 'sendPanel', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/components/portal/SendPanel#SendPanel' }, disableListColumn: true } },
    { name: 'subject', type: 'text', required: true, maxLength: 150 },
    {
      name: 'previewText',
      label: 'Preview text',
      type: 'text',
      maxLength: 150,
      admin: { description: 'Shown after the subject in most inboxes. One short sentence.' },
    },
    {
      name: 'audience',
      type: 'relationship',
      relationTo: 'audiences',
      admin: { description: 'Leave empty to send to every subscribed supporter with an email address.' },
    },
    { name: 'image', label: 'Header image', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText', required: true },
    {
      type: 'row',
      fields: [
        { name: 'buttonLabel', label: 'Button text', type: 'text', maxLength: 40, admin: { description: 'Optional, e.g. “Read the full update”' } },
        {
          name: 'buttonUrl',
          label: 'Button link',
          type: 'text',
          validate: (v: unknown) => (!v || /^https:\/\/\S+$/i.test(String(v)) ? true : 'Enter a full link starting with https://'),
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Sending', value: 'sending' },
        { label: 'Sent', value: 'sent' },
      ],
      admin: { hidden: true },
      access: { update: () => false },
    },
    { name: 'scheduledAt', type: 'date', admin: { hidden: true }, access: { update: () => false } },
    { name: 'sentAt', label: 'Sent', type: 'date', admin: { hidden: true }, access: { update: () => false } },
    { name: 'sentByName', type: 'text', admin: { hidden: true }, access: { update: () => false } },
    {
      name: 'audienceCount',
      type: 'number',
      virtual: true,
      admin: { hidden: true },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            const tenant = idOf(data?.tenant)
            if (tenant == null) return null
            const audienceId = idOf(data?.audience)
            const audience = audienceId
              ? await req.payload.findByID({ collection: 'audiences', id: audienceId, depth: 0, overrideAccess: true }).catch(() => null)
              : null
            return countAudience(req.payload, Number(tenant), { ...(audience ?? {}), requireEmail: true })
          },
        ],
      },
    },
    {
      name: 'stats',
      type: 'json',
      virtual: true,
      admin: { hidden: true },
      hooks: { afterRead: [({ data, req }) => (data?.id ? newsletterStats(req.payload, Number(data.id)) : null)] },
    },
  ],
}
