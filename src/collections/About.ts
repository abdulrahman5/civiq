import type { CollectionConfig } from 'payload'

import { anyone, guardTenantWrite, isOnlyContributor, platformAdminOnly, tenantRole } from '../access'
import { revalidateAfterChange } from '../hooks/revalidate'

export const About: CollectionConfig = {
  slug: 'about',
  labels: { singular: 'About & timeline', plural: 'About & timeline' },
  admin: {
    hidden: ({ user }) => isOnlyContributor(user as Parameters<typeof isOnlyContributor>[0]),
    group: 'Website', useAsTitle: 'id' },
  // One document per legislator (the multi-tenant plugin treats this collection like a global).
  access: { read: anyone, create: tenantRole('admin', 'editor'), update: tenantRole('admin', 'editor'), delete: platformAdminOnly },
  hooks: { beforeChange: [guardTenantWrite(['admin', 'editor'])], afterChange: [revalidateAfterChange] },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'image', label: 'Photo', type: 'upload', relationTo: 'media' },
    { name: 'body', label: 'Biography', type: 'richText' },
    {
      name: 'facts',
      label: 'Quick facts',
      type: 'array',
      maxRows: 6,
      fields: [{ type: 'row', fields: [{ name: 'label', type: 'text', required: true }, { name: 'value', type: 'text', required: true }] }],
    },
    {
      name: 'timeline',
      label: 'Milestones',
      type: 'array',
      fields: [
        { type: 'row', fields: [{ name: 'year', type: 'text', required: true, admin: { width: '25%' } }, { name: 'title', type: 'text', required: true }] },
        { name: 'text', label: 'Description', type: 'textarea' },
      ],
    },
  ],
}
