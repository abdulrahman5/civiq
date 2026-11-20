import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { anyone, guardTenantWrite, isOnlyContributor, isPlatformAdmin, platformAdminOnly, roleIn, tenantRole } from '../access'
import { revalidateAfterChange } from '../hooks/revalidate'

const url: TextFieldSingleValidation = (value) =>
  !value || /^https:\/\/\S+$/i.test(value) ? true : 'Enter a full link starting with https://'

export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  labels: { singular: 'Site settings', plural: 'Site settings' },
  admin: {
    hidden: ({ user }) => isOnlyContributor(user as Parameters<typeof isOnlyContributor>[0]),
    group: 'Website', useAsTitle: 'name' },
  // One document per legislator (the multi-tenant plugin treats this collection like a global).
  access: { read: anyone, create: tenantRole('admin', 'editor'), update: tenantRole('admin', 'editor'), delete: platformAdminOnly },
  hooks: { beforeChange: [guardTenantWrite(['admin', 'editor'])], afterChange: [revalidateAfterChange] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            { name: 'name', label: 'Full name / title', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'shortName', label: 'Short name (logo)', type: 'text', required: true, admin: { description: 'e.g. SMA' } },
                { name: 'party', type: 'text' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'office', type: 'text', admin: { description: 'e.g. Senator or Member, House of Representatives' } },
                { name: 'constituency', type: 'text' },
                { name: 'state', type: 'text' },
              ],
            },
            { name: 'seoDescription', label: 'Search engine description', type: 'textarea', admin: { description: 'Shown by Google and in link previews (about 155 characters).' } },
            { name: 'shareImage', label: 'Link preview image', type: 'upload', relationTo: 'media', admin: { description: 'Shown when the site is shared on WhatsApp, Facebook, X, etc. Ideal size 1200×630. Defaults to the portrait.' } },
          ],
        },
        {
          label: 'Home banner',
          fields: [
            {
              name: 'hero',
              type: 'group',
              label: false,
              fields: [
                { name: 'badge', type: 'text' },
                {
                  type: 'row',
                  fields: [
                    { name: 'headline', type: 'text', required: true },
                    { name: 'highlight', label: 'Highlighted words', type: 'text', admin: { description: 'Shown after the headline in the accent colour.' } },
                  ],
                },
                { name: 'intro', type: 'textarea' },
                { name: 'image', label: 'Portrait photo', type: 'upload', relationTo: 'media', admin: { description: 'Portrait orientation (4:5) works best.' } },
              ],
            },
            {
              name: 'stats',
              label: 'Key numbers',
              type: 'array',
              maxRows: 4,
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'value', label: 'Number', type: 'text', required: true },
                    { name: 'label', type: 'text', required: true },
                  ],
                },
              ],
            },
            { name: 'quote', label: 'Signature quote', type: 'textarea', admin: { description: 'Leave empty to hide the quote section.' } },
          ],
        },
        {
          label: 'Contact & social',
          fields: [
            {
              name: 'contact',
              type: 'group',
              fields: [
                { name: 'address', label: 'Office address', type: 'text' },
                {
                  type: 'row',
                  fields: [
                    { name: 'email', label: 'Public email', type: 'text' },
                    { name: 'phone', label: 'Phone / WhatsApp', type: 'text' },
                  ],
                },
                {
                  name: 'notifyEmail',
                  label: 'Send contact-form alerts to',
                  type: 'email',
                  admin: { description: 'Each new website message is emailed here (and always saved in the Inbox). Not shown publicly.' },
                  // Internal address: only that legislator's team (and the Civiq team) can read it, never the public API.
                  access: { read: ({ req, doc }) => isPlatformAdmin(req.user as Parameters<typeof isPlatformAdmin>[0]) || Boolean(roleIn(req.user as Parameters<typeof roleIn>[0], doc?.tenant)) },
                },
              ],
            },
            {
              name: 'socials',
              label: 'Social media links',
              type: 'group',
              admin: { description: 'Leave a field empty to hide that icon.' },
              fields: [
                { type: 'row', fields: [
                  { name: 'facebook', type: 'text', validate: url },
                  { name: 'x', label: 'X / Twitter', type: 'text', validate: url },
                  { name: 'instagram', type: 'text', validate: url },
                ] },
                { type: 'row', fields: [
                  { name: 'youtube', label: 'YouTube', type: 'text', validate: url },
                  { name: 'tiktok', label: 'TikTok', type: 'text', validate: url },
                ] },
              ],
            },
          ],
        },
        {
          label: 'Privacy',
          description:
            'Every site has a privacy notice at /privacy, linked from both forms. Under the Nigeria Data Protection Act 2023, the legislator’s office is the data controller and Civiq stores the data on its behalf.',
          fields: [
            {
              name: 'privacyEmail',
              label: 'Privacy contact email',
              type: 'email',
              admin: { description: 'Where people send requests to see, correct or delete their data. Defaults to the public email.' },
            },
            {
              name: 'privacyPolicy',
              label: 'Custom privacy notice',
              type: 'richText',
              admin: { description: 'Optional. Leave empty to use Civiq’s standard notice, filled in with this site’s details. Have a lawyer review whichever you use.' },
            },
          ],
        },
      ],
    },
  ],
}
