# Civiq — digital platform for Nigerian legislators

One Next.js app on Vercel serves **every legislator's website**, each on its own domain, plus the **Civiq Portal** where their teams update content. All sites share one template in two colour themes, chosen per site: **Senate** (red) and **House of Representatives** (green). Apart from the theme, only the content differs. A fix or feature shipped here reaches every site at once.

| Address | What it is |
|---|---|
| `saidumusa.ng`, `adaokafor.ng`, … | Each legislator's public site (home, news, contact form), with a small “Powered by Civiq” badge |
| `<slug>.theciviq.com.ng` | Preview of a legislator's site before their own domain is live |
| `portal.theciviq.com.ng/admin` | The Civiq Portal. `/admin` on any legislator's domain redirects here. |

```
saidumusa.ng ─┐
adaokafor.ng ─┼─► Vercel (one Civiq project)
x.theciviq.com.ng   ─┘      │  src/proxy.ts: domain → /<domain>/… → that legislator's content
                     ▼
     public sites (one shared template)      portal.theciviq.com.ng: Payload admin, scoped per team
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

A person can work for several legislators (a role on each); the portal's **Legislator** switcher picks which one they are editing. Every save is checked on the server against the user's role *in that document's site*, so teams can never read or change another legislator's data.

## The portal's own screens

- **Home** (`/admin`): greeting, headline numbers (supporters, new in the last 7 days, unread messages, published news), “Needs attention” (unread messages, unpublished drafts, no recent news, placeholder text still on the site), supporter growth, latest messages, top wards, top interests and quick actions. Contributors see a content-only version. Civiq platform admins who have not picked a legislator see an overview of every site.
- **Community insights** (`/admin/community`): supporter totals, new sign-ups per week, breakdowns by ward, LGA, state, interest and preferred contact, and saved audiences with live counts. Admins and editors only.
- **Inbox** (Inbox): messages are **Unread, Read or Archived**, with tabs and counts above the list. Opening a message marks it read. **Reply by email** from the message screen: it is sent from “Office of <legislator>” with the office email (Site settings → Contact & social) as reply-to, and every reply is logged on the message with who sent it and when. Only the legislator's admins and editors can read or reply. No assignment or deadlines, by design.
- **Newsletters** (Outreach → Newsletters): write an email update (subject, preview text, header image, text, optional button), pick everyone or a saved audience, then **Preview**, **Send test to me**, **Send** or **Schedule** from the panel on the right. It goes to subscribed supporters with an email address, one copy per address, from “Office of <legislator>” with the office email as reply-to. Every email carries the office address and a one-click unsubscribe link; unsubscribing (or marking it as spam) sets the supporter to Unsubscribed. After sending, the panel shows sent, delivered, opened and clicked counts. Sent newsletters are locked. Admins and editors only. Sending needs the office email and address in Site settings.
- **Audiences** (Community → Audiences): saved groups of subscribed supporters (by ward, LGA, state, interest, contact preference, has-email), for newsletters. Place matching ignores case and extra spaces.

Code: `src/components/portal/` (screens, charts, which-legislator logic) and `src/lib/insights.ts` (SQL aggregates; always filtered by tenant, and only called after the portal has checked the user belongs to that legislator).

## What teams edit in the portal

| Section | Contents |
|---|---|
| **Website → Site settings** | Name, party, home banner and portrait, key numbers, quote, contact details, social links |
| **Website → About & timeline**, **Agenda / priorities** | Biography, facts, milestones, priority cards |
| **Website → News & press**, **Projects**, **Photo library** | With drafts and photos |
| **Community → Supporters** | People who joined the movement: contact details, ward/LGA, interests, preferred channels, subscription status and the consent they gave. CSV export. |
| **Inbox** | Contact-form messages for that legislator, with status, notes, consent record and CSV export |
| **Team → Users** | Team members (team admins and platform admins) |
| **Civiq platform → Legislator sites** | Platform admins only: each legislator's name, preview slug, main domain, other domains, status |

Saving updates that legislator's live site immediately.

## Constituents' data and privacy

- **Join the movement** (`#join` on every site) adds a supporter. People who join again with the same phone (normalised to `+234…`) or email are updated, not duplicated; interests are added to, not replaced.
- Both forms require a consent tick box. The exact statement shown (`src/app/(frontend)/[domain]/consent.ts`) is saved with each record together with the date, as evidence of consent.
- Every site has a privacy notice at `/privacy` (Nigeria Data Protection Act 2023): the legislator's office is the data controller, Civiq the data processor. Teams can replace the standard notice and set a privacy contact email in **Site settings → Privacy**. Have a lawyer review the notice before launch.
- Supporters and messages are only created by the site's own server-side forms, never through the API, and only team admins/editors can read them.

### Database-level isolation (row-level security)
Public-site queries run as the restricted Postgres role `civiq_web` inside a transaction tagged with the site's tenant (`asSite()` in `src/lib/payload.ts`). Row-level security on every tenant-owned table only shows and accepts that tenant's rows; with no tenant set it sees nothing. `civiq_web` cannot read users or portal tables and can only insert messages and supporters. The portal uses the normal role, protected by access control. The database user in `DATABASE_URL` needs the `CREATEROLE` privilege (Neon's default owner role has it); locally run `ALTER ROLE <user> CREATEROLE;` as a superuser.

---

## Onboarding a new legislator

Full playbook, from agreement to the first 30 days: **[docs/launching-a-new-site.md](docs/launching-a-new-site.md)**, with the **[client intake checklist](docs/client-intake-checklist.md)** to send to new clients. The portal steps in short:

1. **Portal → Civiq platform → Legislator sites → Create new:** name, **template** (Senate or House of Representatives, which sets the colours), slug (e.g. `adaokafor`), main domain (e.g. `adaokafor.ng`) and any extra domains (`www.adaokafor.ng`; extra domains forward to the main one). Save.
2. On the same screen, **Connect domains**. The portal adds them to Vercel and shows the exact DNS records to give the legislator's registrar (with copy buttons). Press **Check again** later: each domain turns **Live** once DNS works, and HTTPS is automatic. A domain already used on another Vercel account first shows a TXT “ownership check” record.
3. Switch the portal's **Legislator** menu to the new site and fill in **Site settings** (and About / Agenda). The **Setup checklist** next to the domains shows what is left.
4. **Team → Users → Invite a team member:** name, email and role. They get an email with a link to choose their own password (valid 7 days, works once); the inviter also sees the link, to share on WhatsApp if needed. Team admins then invite the rest of their team the same way. The Users list shows who is **Active** (last active time) and who was **Invited, not joined yet**; open someone to **Resend invite**.

Until DNS is live the site is visible at `adaokafor.theciviq.com.ng` (needs `PLATFORM_ROOT_DOMAIN`). Search engines may index a site only on its main domain.

---

## Deploying and configuration

Hosting: Vercel (Pro required before launch), Neon Postgres and Vercel Blob connected in the project's **Storage** tab, Resend for email.

| Variable | Value |
|---|---|
| `DATABASE_URL` | Added by the Neon integration (pooled connection) |
| `BLOB_READ_WRITE_TOKEN` | Added by the Blob integration |
| `PAYLOAD_SECRET` | Long random string; never change it |
| `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Email via Resend |
| `VERCEL_TOKEN` | A Vercel access token (Vercel → Account settings → Tokens) with access to this project's team. Lets the portal add domains and check their DNS. Without it domains are added by hand in Vercel |
| `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | From Vercel → Project → Settings → General (Project ID) and Team → Settings (Team ID; leave empty for a personal account) |
| `RESEND_WEBHOOK_SECRET` | Newsletter delivery/open/click/bounce tracking. In Resend → Webhooks add `https://<portal>/api/newsletters/resend-webhook` with the email events, then copy its signing secret (`whsec_…`) here |
| `CRON_SECRET` | Long random string. Vercel sends it to `/api/newsletters/cron` (set in `vercel.json`), which sends scheduled newsletters and finishes large sends |
| `NEWSLETTER_CRON_FREQUENT` | Set to `1` after moving to Vercel Pro and changing the cron in `vercel.json` to every 5 minutes (`*/5 * * * *`). On the free plan the cron runs once a day at 07:00 UTC |
| `PORTAL_URL` | e.g. `https://portal.theciviq.com.ng` once that domain is attached. Until set, the portal runs on the deployment's own address. |
| `PLATFORM_ROOT_DOMAIN` | e.g. `theciviq.com.ng`, for `<slug>.theciviq.com.ng` previews (add `*.theciviq.com.ng` as a wildcard domain in Vercel) |
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
- New tenant-owned collections must be added to the `multiTenantPlugin` list in `payload.config.ts` and use `tenantRole(...)` access plus a `guardTenantWrite(...)` hook (see `src/access.ts`). If the public site reads it, its migration must also add a row-level security policy and call `SELECT civiq_grant_web();`.
- After changing fields: `npm run generate:types && npm run generate:importmap && npm run migrate:create <name>`, and commit the migration.

**Pending clean-up:** `users.role` (the old single-site role) is kept hidden for the data migration; drop the field and its column in the next release.

```
src/
  proxy.ts                 domain → tenant routing, portal redirects
  payload.config.ts        CMS configuration and multi-tenant plugin
  access.ts                platform and per-tenant roles
  collections/             Tenants, Site settings, About, Agenda, News, Projects, Media, Supporters, Messages, Users
  lib/tenant.ts            finds the legislator site for a domain
  app/(frontend)/[domain]/ the shared site template
  app/(payload)/           portal and API (generated by Payload)
  migrations/              database history, incl. the multi-tenant data migration
  seed/                    first-run content for a brand-new database
```
