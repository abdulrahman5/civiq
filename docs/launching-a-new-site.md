# Launching a new legislator site

The Civiq team's playbook for taking a new legislator from signed agreement to a live site and an active team. Every site uses the same template, so launching one means collecting the client's content, setting it up in the portal, connecting their domain and handing over to their team. Nobody writes code.

Most of the elapsed time is spent waiting: for the client's content (step 2) and for DNS (step 5). The hands-on work is a few hours.

| Step | Who | Typical time |
|---|---|---|
| [1. Agreement](#1-agreement) | Civiq + client | Day 0 |
| [2. Collect content](#2-collect-content) | Client | Days 1–5 |
| [3. Create the site](#3-create-the-site) | Civiq | 10 minutes |
| [4. Design and fill the site](#4-design-and-fill-the-site) | Civiq | 1–2 hours |
| [5. Connect the domain](#5-connect-the-domain) | Civiq + registrar | 10 minutes, then up to 48 hours |
| [6. Hand over to the team](#6-hand-over-to-the-team) | Civiq + client | Days 5–7 |
| [7. Go-live check](#7-go-live-check) | Civiq | 30 minutes |
| [8. Launch and the first 30 days](#8-launch-and-the-first-30-days) | Client, with Civiq | Day 7–37 |

The examples below use **Hon. Ada Okafor** with the domain `adaokafor.ng`.

---

## 1. Agreement

- **Contract and data processing agreement.** Under the Nigeria Data Protection Act 2023, the legislator's office is the *data controller* for supporters' and constituents' details, and Civiq is the *data processor*. The privacy notice on every site (`/privacy`) already says this; the contract and a data processing agreement should match it.
- **Domain.** Agree who buys the domain and where. Recommended: registered in the legislator's (or their office's) name, with Civiq given access to manage its DNS. Check it is available before promising it.
- **Main contact.** Agree one person on their team as the main contact. They become the team **Admin** in the portal.

## 2. Collect content

Send the client the [client intake checklist](client-intake-checklist.md). Everything the template can show comes from it. Ask for it in one go (a shared folder works well) rather than piece by piece over WhatsApp.

While waiting, you can already do steps 3 and 5 (create the site and connect the domain), since they only need the name and domain.

## 3. Create the site

1. Log in to the portal as a Civiq platform admin.
2. **Civiq platform → Legislator sites → Create new:**
   - **Legislator / site name:** `Hon. Ada Okafor`
   - **Slug:** `adaokafor` (lowercase, no spaces; it also forms the preview address)
   - **Main domain:** `adaokafor.ng`
   - **Other domains:** `www.adaokafor.ng` (these forward to the main domain)
3. **Save.**

The site exists straight away at its **preview address**, `https://adaokafor.theciviq.com.ng`. It works before the real domain is connected, so use it to build the site and to show the client progress.

## 4. Design and fill the site

On Civiq, "design" means filling the shared template with the client's identity and content. It does not mean a new layout.

Switch the portal's **Legislator** menu (top of the sidebar) to *Hon. Ada Okafor*, then work through:

| Portal section | What to fill in |
|---|---|
| **Website → Site settings → General** | Full name / title, short name (logo), party, office, constituency, state, search engine description, link preview image |
| **Site settings → Brand colours** | Main colour and accent colour |
| **Site settings → Home banner** | Badge, headline and highlighted words, intro, portrait photo, key numbers, signature quote |
| **Site settings → Contact & social** | Office address, public email, phone/WhatsApp, where contact-form alerts go, social media links |
| **Site settings → Privacy** | Privacy contact email (leave the standard notice unless their lawyer provides one) |
| **Website → About & timeline** | Heading, photo, biography, quick facts, timeline |
| **Website → Agenda / priorities** | Heading, intro, 4–6 priorities with icons |
| **Website → Projects** | A few completed projects with photos |
| **Website → News & press** | 2–3 recent stories, so the site is not empty at launch |
| **Website → Photo library** | All photos (they can also be uploaded from each field) |

Then:

1. Open the preview address on a **phone** and a **laptop** and read every section.
2. Send the client the preview link to approve. Make their changes, then get a written "approved".

**Design tips**
- **Colours.** White text sits on the main colour (header, banners, buttons), so the main colour must be dark enough to read white text on. Very light party colours (yellow, light green) work better as the accent colour.
- **Portrait.** Upright (4:5), well lit, face clearly visible, at least 1200 px tall. It is the most important image on the site.
- **Link preview image.** 1200×630. This is what people see when the site is shared on WhatsApp, Facebook or X. Without it the portrait is used.
- **Key numbers.** Use 3–4 concrete, checkable figures. Avoid vague claims.

**Requests outside the template.** A new section, a different layout or a custom feature cannot be built for one client alone. A template change applies to every legislator's site, which is what keeps Civiq affordable and easy to run. Record such requests as roadmap items and tell the client they may come to all sites later.

## 5. Connect the domain

Needs `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` to be set (see the README). Without them, add the domains by hand in Vercel → Project → Settings → Domains.

1. Open the site in **Civiq platform → Legislator sites**.
2. In the **Domains** panel, click **Connect domains**. The portal adds the main and extra domains to Vercel.
3. The panel then lists the **DNS records** to set, with copy buttons. Usually:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | the IP address shown |
   | CNAME | `www` | the address shown |

4. At the registrar (for example, the domain's DNS zone page at Whogohost), add those records. **Remove any other A or CNAME records for the same names**, and set the TTL to the lowest option.
5. Come back and click **Check again**. Each domain shows one of:

   | Status | Meaning |
   |---|---|
   | **Not connected** | Not yet added to Vercel. Click **Connect domains**. |
   | **Needs ownership check** | The domain is used on another Vercel account. Add the TXT record shown, then **Connect domains** again. |
   | **Waiting for DNS** | Added, but the records are not visible yet. Usually within an hour, sometimes up to 48 hours. |
   | **Live** | Working. HTTPS is set up automatically, and extra domains forward to the main one. |

Search engines only index a site on its main domain, never on the preview address.

## 6. Hand over to the team

1. **Team → Users → Invite a team member**: the client's main contact, role **Admin**, team *Hon. Ada Okafor*.
   - They receive an email with a link to choose their own password. The link works once and expires after 7 days.
   - The same link is shown to you, with **Copy link** and **Send on WhatsApp**, in case the email is slow or lands in spam. Send it to them directly, never in a group.
   - If it expires, open their user and click **Resend invite**.
2. **Training call (about 30 minutes)** with their admin and anyone else who will use the portal:
   - Home dashboard and "Needs attention"
   - Posting news (drafts vs published) and adding projects and photos
   - The Inbox: reading, replying by email, archiving
   - Community insights and saved audiences
   - Newsletters: write, preview, send a test to yourself, then send or schedule
   - Inviting their own team and choosing roles
3. Their admin then invites the rest of the team:

   | Role | Can do |
   |---|---|
   | **Admin** | Everything for their legislator, including inviting and removing team members |
   | **Editor** | Website content, Site settings, Community, Inbox and Newsletters |
   | **Contributor** | Write drafts for the website only; an Editor or Admin publishes them |

## 7. Go-live check

The **Setup checklist** next to the Domains panel tracks the first four items automatically.

- [ ] No "[…]" placeholder text left in Site settings or About
- [ ] Office email and postal address set (needed for replies and newsletters)
- [ ] Team admin invited **and** has logged in
- [ ] Main domain shows **Live**
- [ ] `www` (and any other domains) forward to the main domain
- [ ] Every page read on a phone: home, about, agenda, projects, news, contact, privacy
- [ ] Test **Join the movement** form: appears in **Community → Supporters**
- [ ] Test contact form message: appears in the **Inbox**, and the alert email arrives
- [ ] Site link shared on WhatsApp: the preview shows the right image and description
- [ ] Client has approved the site in writing

Delete your test supporter and test message afterwards.

## 8. Launch and the first 30 days

| When | What |
|---|---|
| **Launch day** | The legislator announces the site on all their social accounts with a clear call to **join the movement**. Supporter sign-ups are what make the portal valuable later. |
| **Week 1** | First news post. Replies to the first contact messages. |
| **Weeks 2–4** | First newsletter once there are supporters with email addresses. (The Home dashboard reminds them after 30 days without one.) |
| **Day 30** | Review call with the Honourable or chief of staff: supporter growth, top wards and interests (Community insights), messages handled, and an agreed rhythm for news and newsletters. |

---

## Known gaps

Improvements that would make this process faster, not yet built:

1. **Client intake inside the portal.** Today the [intake checklist](client-intake-checklist.md) is sent outside the portal; a shareable intake form would stop content arriving in pieces.
2. **Pre-filled starter content.** New sites start nearly empty. Guided example text (an About layout, sample agenda items) would speed up step 4 and show clients what good looks like.
3. **Colour check.** The portal does not yet warn when the main colour makes white text hard to read.
