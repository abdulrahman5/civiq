import type { CollectionConfig } from 'payload'

import { anyone, guardTenantWrite, isOnlyContributor, platformAdminOnly, tenantRole } from '../access'
import { revalidateAfterChange } from '../hooks/revalidate'
import { ICON_NAMES } from '../lib/icons'

export const Agenda: CollectionConfig = {
  slug: 'agenda',
  labels: { singular: 'Agenda / priorities', plural: 'Agenda / priorities' },
  admin: {
    hidden: ({ user }) => isOnlyContributor(user as Parameters<typeof isOnlyContributor>[0]),
    group: 'Website', useAsTitle: 'id' },
  // One document per legislator (the multi-tenant plugin treats this collection like a global).
  access: { read: anyone, create: tenantRole('admin', 'editor'), update: tenantRole('admin', 'editor'), delete: platformAdminOnly },
  hooks: { beforeChange: [guardTenantWrite(['admin', 'editor'])], afterChange: [revalidateAfterChange] },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    {
      name: 'items',
      label: 'Priorities',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'icon', type: 'select', required: true, defaultValue: 'community', options: ICON_NAMES, admin: { width: '30%' } },
            { name: 'title', type: 'text', required: true },
          ],
        },
        { name: 'text', label: 'Description', type: 'textarea', required: true },
      ],
    },
  ],
}
