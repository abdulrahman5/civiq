# Civiq — digital platform for Nigerian legislators

One Next.js app on Vercel serves **every legislator's website**, each on its own domain, plus the **Civiq console** where their teams update content. All sites share one template; only the content differs. A fix or feature shipped here reaches every site at once.

| Address | What it is |
|---|---|
| `saidumusa.ng`, `adaokafor.ng`, … | Each legislator's public site (home, news, contact form), with a small “Powered by Civiq” badge |
| `<slug>.civiq.ng` | Preview of a legislator's site before their own domain is live |
| `console.civiq.ng/admin` | The Civiq console. `/admin` on any legislator's domain redirects here. |

```
saidumusa.ng ─┐
adaokafor.ng ─┼─► Vercel (one Civiq project)
x.civiq.ng   ─┘      │  src/proxy.ts: domain → /<domain>/… → that legislator's content
                     ▼
     public sites (one shared template)      console.civiq.ng: Payload admin, scoped per team
                     │
       Neon Postgres (every row tagged with its tenant) · Vercel Blob (photos) · Resend (email)
```

## Roles

| Role | Where | Can do |
|---|---|---|
| **Civiq platform admin** | whole platform | Add legislator sites and domains, manage every site and user. The first account ever created gets this role. |
| **Team admin** | one legislator | All of that legislator's content and inbox, and add/remove their own team members |
| **Editor** | one legislator | All content, settings and the inbox |
| **Contributor** | one legislator | Write drafts of news and projects; cannot publish, delete or see the inbox |

A person can work for several legislators (a role on each); the console's **Legislator** switcher picks which one they are editing. Every save is checked on the server against the user's role *in that document's site*, so teams can never read or change another legislator's data.

## What teams edit in the console

| Section | Contents |
|---|---|
| **Website → Site settings** | Name, party, brand colours, home banner and portrait, key numbers, quote, contact details, social links |
| **Website → About & timeline**, **Agenda / priorities** | Biography, facts, milestones, priority cards |
| **Website → News & press**, **Projects**, **Photo library** | With drafts and photos |
| **Inbox** | Contact-form messages for that legislator, with status, notes and CSV export |
| **Team → Users** | Team members (team admins and platform admins) |
| **Civiq platform → Legislator sites** | Platform admins only: each legislator's name, preview slug, main domain, other domains, status |

Saving updates that legislator's live site immediately.

---

## Onboarding a new legislator

1. **Console → Civiq platform → Legislator sites → Create new:** name, slug (e.g. `adaokafor`), main domain (e.g. `adaokafor.ng`) and any extra domains (`www.adaokafor.ng`).
2. **Vercel → Project → Settings → Domains:** add the same domains, then set the DNS records Vercel shows at the legislator's registrar. HTTPS is automatic. (Phase 2 automates this step from the console.)
3. Switch the console's **Legislator** menu to the new site and fill in **Site settings** (and About / Agenda).
4. **Team → Users:** create their team admin with a role on that legislator; they can then add their own editors.

Until DNS is live the site is visible at `adaokafor.civiq.ng` (needs `PLATFORM_ROOT_DOMAIN`). Search engines may index a site only on its main domain.

---

## Deploying and configuration

Hosting: Vercel (Pro required before launch), Neon Postgres and Vercel Blob connected in the project's **Storage** tab, Resend for email.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Added by the Neon integration (pooled connection) |
| `BLOB_READ_WRITE_TOKEN` | Added by the Blob integration |
| `PAYLOAD_SECRET` | Long random string; never change it |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Email via Resend |
| `CONSOLE_URL` | e.g. `https://console.civiq.ng` once that domain is attached. Until set, the console runs on the deployment's own address. |
| `PLATFORM_ROOT_DOMAIN` | e.g. `civiq.ng`, for `<slug>.civiq.ng` previews (add `*.civiq.ng` as a wildcard domain in Vercel) |
| `DEFAULT_TENANT_SLUG` | Optional: which site `*.vercel.app` and `localhost` show (default: the first site) |

Every **production** deploy runs `scripts/build.mjs`: database migrations → first-run seed (only on an empty database) → `next build`. Preview deployments skip the database steps.

### Upgrading the existing SMA deployment
The `multi_tenant` migration moves the existing single site into Civiq without losing anything: it creates the tenant `saidumusa` (override with `MIGRATION_TENANT_SLUG`), tags every existing document with it, makes former Super Admins Civiq platform admins *and* SMA team admins, and keeps editors and contributors in their roles on SMA's team. The site keeps working on its `vercel.app` address with no new settings. Then set SMA's main domain in **Legislator sites** when his domain is attached.

---

## For developers

```bash
cp .env.example .env        # fill in DATABASE_URL and PAYLOAD_SECRET
npm install
npm run migrate && npm run seed
npm run dev                 # http://localhost:3000 (first site), http://<slug>.localhost:3000 (any site), /admin
```

**Rules for code in this repo**
- Public pages live under `src/app/(frontend)/[domain]/` and must load data through `loadSite()` and the helpers in `src/lib/payload.ts`, which always filter by tenant. Anonymous reads are **not** tenant-scoped by access control, so never query content without a tenant filter.
- New tenant-owned collections must be added to the `multiTenantPlugin` list in `payload.config.ts` and use `tenantRole(...)` access plus a `guardTenantWrite(...)` hook (see `src/access.ts`).
- After changing fields: `npm run generate:types && npm run generate:importmap && npm run migrate:create <name>`, and commit the migration.

**Pending clean-up:** `users.role` (the old single-site role) is kept hidden for the data migration; drop the field and its column in the next release.

```
src/
  proxy.ts                 domain → tenant routing, console redirects
  payload.config.ts        CMS configuration and multi-tenant plugin
  access.ts                platform and per-tenant roles
  collections/             Tenants, Site settings, About, Agenda, News, Projects, Media, Messages, Users
  lib/tenant.ts            finds the legislator site for a domain
  app/(frontend)/[domain]/ the shared site template
  app/(payload)/           console and API (generated by Payload)
  migrations/              database history, incl. the multi-tenant data migration
  seed/                    first-run content for a brand-new database
```
