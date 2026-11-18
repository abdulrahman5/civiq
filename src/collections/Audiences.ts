import type { CollectionConfig } from 'payload'

import { guardTenantWrite, idOf, tenantRole } from '../access'
import { countAudience } from '../lib/insights'
import { CONTACT_CHANNELS, SUPPORTER_INTERESTS } from './Supporters'

// A saved group of supporters (e.g. "Youth · Bida LGA"), reused when sending newsletters.
// Only subscribed supporters ever count; an empty filter means "everyone".
export const Audiences: CollectionConfig = {
  slug: 'audiences',
  labels: { singular: 'Audience', plural: 'Audiences' },
  admin: {
    group: 'Community',
    useAsTitle: 'name',
    defaultColumns: ['name', 'memberCount', 'updatedAt'],
    description: 'Saved groups of supporters, for sending newsletters to the right people. Leave a filter empty to include everyone.',
  },
  access: {
    read: tenantRole('admin', 'editor'),
    create: tenantRole('admin', 'editor'),
    update: tenantRole('admin', 'editor'),
    delete: tenantRole('admin', 'editor'),
  },
  hooks: {
    beforeChange: [guardTenantWrite(['admin', 'editor'])],
  },
  fields: [
    { name: 'name', type: 'text', required: true, admin: { description: 'e.g. “Youth in Bida LGA” or “Volunteers”' } },
    { name: 'description', type: 'textarea' },
    {
      name: 'memberCount',
      label: 'Supporters',
      type: 'number',
      virtual: true,
      admin: { readOnly: true, description: 'Subscribed supporters who currently match. Updates as people join.' },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            const tenant = idOf(data?.tenant)
            return tenant == null ? null : countAudience(req.payload, Number(tenant), data ?? {})
          },
        ],
      },
    },
    {
      type: 'collapsible',
      label: 'Who is included',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'wards', type: 'text', hasMany: true, admin: { description: 'Type a ward and press Enter. Spelling must match; case does not.' } },
            { name: 'lgas', label: 'LGAs', type: 'text', hasMany: true },
            { name: 'states', type: 'text', hasMany: true },
          ],
        },
        { name: 'interests', type: 'select', hasMany: true, options: SUPPORTER_INTERESTS, admin: { description: 'Anyone interested in at least one of these.' } },
        { name: 'channels', label: 'Preferred contact', type: 'select', hasMany: true, options: CONTACT_CHANNELS },
        { name: 'requireEmail', label: 'Only people with an email address', type: 'checkbox', defaultValue: true, admin: { description: 'Needed for newsletters.' } },
      ],
    },
  ],
}
