import type { CollectionConfig, FieldHook, TextFieldSingleValidation } from 'payload'

import { isLoggedIn, isPlatformAdmin, platformAdminOnly } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from '../hooks/revalidate'
import { domainConnectEndpoint, domainStatusEndpoint } from '../lib/domains'
import { RESERVED_SLUGS } from '../lib/reserved'
import { CHAMBER_OPTIONS } from '../lib/themes'

export const normaliseDomain = (v: string) =>
  v
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '')

const domainFormat: TextFieldSingleValidation = (value) =>
  !value || /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
    ? true
    : 'Enter a domain such as saidumusa.ng (no https:// or slashes)'

const slugFormat: TextFieldSingleValidation = (value) =>
  !value
    ? true
    : !/^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/.test(value)
      ? 'Lowercase letters, numbers and hyphens only'
      : RESERVED_SLUGS.has(value)
        ? `“${value}” is reserved for Civiq's own addresses. Choose another slug.`
        : true

const toDomain: FieldHook = ({ value }) => (typeof value === 'string' ? normaliseDomain(value) : value)

// One tenant = one legislator's site. Every site uses the same template; only the content differs.
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: { singular: 'Legislator site', plural: 'Legislator sites' },
  admin: {
    group: 'Civiq platform',
    useAsTitle: 'name',
    defaultColumns: ['name', 'chamber', 'slug', 'primaryDomain', 'status'],
    description: 'Each legislator on Civiq. Only Civiq platform admins can add sites or change domains.',
    hidden: ({ user }) => !isPlatformAdmin(user as Parameters<typeof isPlatformAdmin>[0]),
  },
  access: {
    read: isLoggedIn, // the plugin limits team members to their own tenants
    create: platformAdminOnly,
    update: platformAdminOnly,
    delete: platformAdminOnly,
  },
  endpoints: [domainStatusEndpoint, domainConnectEndpoint],
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    { name: 'name', label: 'Legislator / site name', type: 'text', required: true },
    {
      name: 'chamber',
      label: 'Template',
      type: 'select',
      required: true,
      options: CHAMBER_OPTIONS,
      admin: {
        description: 'Senate sites use the red theme, House of Representatives sites the green theme. Everything else is identical.',
        components: { Field: '@/components/portal/ChamberPicker#ChamberPicker' },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: slugFormat,
      admin: { description: 'Short ID, also used for the preview address slug.theciviq.com.ng. Example: saidumusa' },
    },
    {
      name: 'primaryDomain',
      label: 'Main domain',
      type: 'text',
      unique: true,
      validate: domainFormat,
      hooks: { beforeValidate: [toDomain] },
      admin: { description: 'The address used for links, sharing and Google, e.g. saidumusa.ng. Search indexing turns on once this is live.' },
    },
    {
      name: 'domains',
      label: 'Other domains',
      type: 'array',
      admin: { description: 'Extra addresses, e.g. www.saidumusa.ng. They forward to the main domain.' },
      fields: [{ name: 'domain', type: 'text', required: true, validate: domainFormat, hooks: { beforeValidate: [toDomain] } }],
    },
    // Connect the domains to Vercel, the DNS records to set, and the onboarding checklist.
    { name: 'domainPanel', type: 'ui', admin: { components: { Field: '@/components/portal/DomainPanel#DomainPanel' }, disableListColumn: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
      ],
      admin: { position: 'sidebar', description: 'Suspended sites show “site not found” to visitors.' },
    },
    {
      name: 'showcase',
      label: 'Show on theciviq.com.ng',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Lists this site in the showcase on Civiq’s own website, once its main domain is set. Only with the legislator’s agreement.' },
    },
  ],
}
