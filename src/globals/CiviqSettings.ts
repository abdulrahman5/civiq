import type { GlobalConfig } from 'payload'

import { revalidatePath } from 'next/cache'

import { isPlatformAdmin, platformAdminOnly } from '../access'

const url = (v: unknown) => (!v || /^https:\/\/\S+$/i.test(String(v)) ? true : 'Enter a full link starting with https://')
const email = (v: unknown) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? true : 'Enter a valid email address')

// Civiq's own details, shown on the marketing site (theciviq.com.ng). Civiq team only.
export const CiviqSettings: GlobalConfig = {
  slug: 'civiq-settings',
  label: 'Civiq marketing site',
  admin: {
    group: 'Civiq platform',
    description: 'Contact details and lead alerts for theciviq.com.ng. Legislators shown on the site are chosen on each Legislator site (“Show on theciviq.com.ng”).',
    hidden: ({ user }) => !isPlatformAdmin(user as Parameters<typeof isPlatformAdmin>[0]),
  },
  access: { read: platformAdminOnly, update: platformAdminOnly },
  hooks: {
    // Show new contact details on theciviq.com.ng straight away.
    afterChange: [
      ({ doc, req }) => {
        try {
          revalidatePath('/civiq', 'layout')
        } catch (err) {
          req.payload.logger.debug({ err }, 'Skipped revalidation')
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'salesEmail', label: 'Sales email', type: 'text', validate: email, admin: { description: 'Shown on the site, e.g. hello@theciviq.com.ng' } },
        { name: 'whatsapp', label: 'WhatsApp number', type: 'text', admin: { description: 'International format, e.g. +2348030000000. Adds a “Chat on WhatsApp” button.' } },
      ],
    },
    { name: 'leadNotifyEmail', label: 'Send new lead alerts to', type: 'text', validate: email, admin: { description: 'Who is emailed when someone requests a demo.' } },
    {
      type: 'row',
      fields: [
        { name: 'linkedin', label: 'LinkedIn', type: 'text', validate: url },
        { name: 'x', label: 'X / Twitter', type: 'text', validate: url },
      ],
    },
  ],
}
