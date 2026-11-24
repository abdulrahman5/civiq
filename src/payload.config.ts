import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { isPlatformAdmin, TENANT_ROLES } from './access'
import { getAdminUrl } from './lib/apps'
import { About } from './collections/About'
import { Audiences } from './collections/Audiences'
import { Agenda } from './collections/Agenda'
import { Media } from './collections/Media'
import { Messages } from './collections/Messages'
import { Leads } from './collections/Leads'
import { SiteChecks } from './collections/SiteChecks'
import { SupportFiles } from './collections/SupportFiles'
import { SupportRequests } from './collections/SupportRequests'
import { NewsletterDeliveries } from './collections/NewsletterDeliveries'
import { CiviqSettings } from './globals/CiviqSettings'
import { Newsletters } from './collections/Newsletters'
import { News } from './collections/News'
import { Projects } from './collections/Projects'
import { SiteSettings } from './collections/SiteSettings'
import { Supporters } from './collections/Supporters'
import { Tenants } from './collections/Tenants'
import { teamManagerField, Users } from './collections/Users'
import type { Config } from './payload-types'
import { getPortalUrl } from './lib/site-url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Vercel's Neon integration provides DATABASE_URL (pooled); POSTGRES_URL is accepted as a fallback.
const databaseUrl = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim()

// On Vercel, fail early with a clear message instead of a confusing "cannot connect to 127.0.0.1" error.
if (process.env.VERCEL) {
  const fix = 'Fix it in Vercel → Project → Settings → Environment Variables (tick Production), then redeploy.'
  const missing = [!databaseUrl && 'DATABASE_URL', !process.env.PAYLOAD_SECRET && 'PAYLOAD_SECRET'].filter(Boolean)
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}. ${fix} ` +
        'DATABASE_URL is added automatically when a Neon database is connected in the Storage tab.',
    )
  }
  let host = ''
  try {
    const u = new URL(databaseUrl)
    if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error()
    host = u.hostname
  } catch {
    throw new Error(
      `DATABASE_URL is not a valid connection string (it starts with "${databaseUrl.slice(0, 12)}…"). ` +
        `It must start with postgresql:// — paste only the connection string, without "psql", quotes or "DATABASE_URL=". ${fix}`,
    )
  }
  if (!host || /^(localhost|127\.0\.0\.1|::1)$/.test(host)) {
    throw new Error(`DATABASE_URL points to "${host || 'localhost'}", which only exists on a developer's computer. Use your Neon connection string. ${fix}`)
  }
  console.log(`Database host: ${host}`)
}

export default buildConfig({
  // The portal (admin + API) lives on one Civiq address; legislators' own domains only serve their sites.
  serverURL: getPortalUrl(),
  // The Civiq Admin (ADMIN_URL) is the same app on a second address: accept logged-in requests from both.
  csrf: [getPortalUrl(), getAdminUrl()].filter((u): u is string => Boolean(u)),
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    // Built-in avatar instead of Gravatar, so admin email hashes are not sent to a third party.
    avatar: 'default',
    meta: {
      titleSuffix: ' · Civiq',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/civiq-mark.svg' }],
    },
    components: {
      beforeNavLinks: ['@/components/portal/NavScope#NavScope', '@/components/portal/PortalNav#PortalNav'],
      actions: ['@/components/portal/HelpButton#HelpButton'],
      views: {
        // The portal's Home screen and Community insights page.
        dashboard: { Component: '@/components/portal/Dashboard#Dashboard' },
        community: { Component: '@/components/portal/Community#Community', path: '/community', meta: { title: 'Community insights' } },
        // Civiq Admin: live status and health of every legislator site.
        monitoring: { Component: '@/components/portal/Monitoring#Monitoring', path: '/monitoring', meta: { title: 'Site health' } },
      },
      graphics: {
        Logo: '@/components/admin/Logo#Logo',
        Icon: '@/components/admin/Icon#Icon',
      },
    },
  },
  collections: [SiteSettings, About, Agenda, News, Projects, Media, Supporters, Audiences, Messages, Newsletters, NewsletterDeliveries, Users, Tenants, Leads, SupportRequests, SupportFiles, SiteChecks],
  globals: [CiviqSettings],
  // Plain-English wording on the login screen ("Log in", not "Login").
  i18n: { translations: { en: { authentication: { login: 'Log in', logout: 'Log out' } } } },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    // Schema changes always go through migrations (src/migrations), locally and in production.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  graphQL: { disable: true },
  sharp,
  telemetry: false,
  // Without a Resend key (e.g. local development) emails are printed to the console instead.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        defaultFromName: process.env.EMAIL_FROM_NAME || 'Civiq',
      })
    : undefined,
  plugins: [
    // One codebase and database, many legislators: every content document belongs to one tenant,
    // and team members only ever see the tenants they work for.
    multiTenantPlugin<Config>({
      tenantsSlug: 'tenants',
      collections: {
        'site-settings': { isGlobal: true },
        about: { isGlobal: true },
        agenda: { isGlobal: true },
        news: {},
        projects: {},
        media: {},
        messages: {},
        supporters: {},
        audiences: {},
        newsletters: {},
        'newsletter-deliveries': {},
        'support-requests': {},
        'support-files': {},
      },
      tenantsArrayField: {
        includeDefaultField: true,
        arrayFieldAccess: { create: teamManagerField, update: teamManagerField },
        rowFields: [{ name: 'role', type: 'select', required: true, defaultValue: 'editor', options: [...TENANT_ROLES] }],
      },
      userHasAccessToAllTenants: (user) => isPlatformAdmin(user as Parameters<typeof isPlatformAdmin>[0]),
      i18n: { translations: { en: { 'nav-tenantSelector-label': 'Legislator' } } },
    }),
    // Photos go to Vercel Blob in production; locally (no token) they are saved to ./media.
    // Website photos are public, so they are served straight from Blob's CDN (no server function per image).
    // Support attachments stay behind Payload's access control: only that office and Civiq can open them.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: { disablePayloadAccessControl: true }, 'support-files': true },
      // Keep the storage fields in the schema even locally (no token), so the database matches production.
      alwaysInsertFields: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Upload straight from the browser to Blob, avoiding Vercel's 4.5 MB request limit for phone photos.
      clientUploads: true,
    }),
  ],
})
