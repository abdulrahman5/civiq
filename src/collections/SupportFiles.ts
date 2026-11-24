import type { CollectionConfig } from 'payload'

import { guardTenantWrite, platformAdminOnly, tenantRole } from '../access'

// Screenshots and files attached to support requests. Kept apart from the Photo library (which feeds the
// public website) and never public: only that legislator's team and the Civiq team can open them.
export const SupportFiles: CollectionConfig = {
  slug: 'support-files',
  labels: { singular: 'Support file', plural: 'Support files' },
  admin: { hidden: true, useAsTitle: 'filename' },
  access: {
    read: tenantRole('admin', 'editor', 'contributor'),
    create: tenantRole('admin', 'editor', 'contributor'),
    update: () => false,
    delete: platformAdminOnly,
  },
  hooks: { beforeChange: [guardTenantWrite(['admin', 'editor', 'contributor'])] },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  },
  fields: [],
}
