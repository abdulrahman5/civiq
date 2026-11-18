import type { CollectionConfig } from 'payload'

import { tenantRole } from '../access'

// One row per newsletter recipient: the send queue, the duplicate-send guard and the source of the
// newsletter statistics. Written only by the server (sending and Resend webhooks), never by people.
export const NewsletterDeliveries: CollectionConfig = {
  slug: 'newsletter-deliveries',
  labels: { singular: 'Newsletter delivery', plural: 'Newsletter deliveries' },
  admin: { hidden: true, useAsTitle: 'email' },
  access: {
    read: tenantRole('admin', 'editor'),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'newsletter', type: 'relationship', relationTo: 'newsletters', required: true, index: true },
    { name: 'supporter', type: 'relationship', relationTo: 'supporters' },
    { name: 'email', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      index: true,
      options: ['queued', 'claimed', 'sent', 'failed', 'bounced', 'complained'],
    },
    { name: 'resendId', type: 'text', index: true },
    { name: 'sentAt', type: 'date' },
    { name: 'deliveredAt', type: 'date' },
    { name: 'openedAt', type: 'date' },
    { name: 'clickedAt', type: 'date' },
    { name: 'error', type: 'text' },
  ],
}
