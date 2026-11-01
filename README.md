# Loose Ends

**https://www.looseends.life** · *Tie up your loose ends.*

A private "dead man's switch" vault. People record their subscriptions, bank accounts, investments, insurance, online accounts and personal messages, and choose trusted contacts. If they stop answering periodic check-in emails, each contact receives a private link to exactly what was shared with them.

**Deploying for the first time? → see [SETUP.md](./SETUP.md).** · **Landing pages & ads → see [MARKETING.md](./MARKETING.md).**

## How it works

1. **Sign in with email**: passwordless magic links. Signing up and signing in are the same flow.
2. **Vault**: items of 8 kinds (subscription, bank, investment, crypto wallet, insurance, online account, other, message). Item contents are encrypted with AES-256-GCM before being stored.
3. **Trusted contacts**: name, email, optional personal message (also encrypted). Each item is shared with *everyone* or *selected contacts*.
4. **Release switch**: the owner picks one of two modes (never both), in Check-in & settings:
   - **Email check-ins** (`checkin`): every N days (7–180) the owner must check in. Overdue → status `warning` and reminders every 1–3 days for the grace period (3–30 days) → `triggered`: each contact gets an email with a personal `/access/<token>` link, and the owner gets a notice.
   - **Trusted contacts claim** (`claim`): no scheduled emails. Each contact is emailed a personal `/claim/<token>` link. Requesting access sets status `warning` and emails the owner (with reminders). If the owner doesn't reject within the grace period, the vault is released to all contacts. One claim at a time; rejecting tells the contact.
   - **Automatic check-in**: any signed-in visit counts (at most once an hour). In check-in mode it resets the timer and stops reminders. In claim mode it never cancels a pending claim (someone could be using the owner's signed-in device); the owner must press "I'm OK — reject".
   - After a release, the owner can sign in and **revoke & reset**, which invalidates all access links.
5. A daily Vercel Cron (`vercel.json`) calls `/api/cron/check-switches` (protected by `CRON_SECRET`).

## Stack

- **Next.js 16** (App Router, Server Actions), React 19, Tailwind CSS 4
- **Postgres** via Drizzle ORM + `postgres` driver (Neon in production)
- **Email**: Resend HTTP API, or any SMTP server (nodemailer). Without a provider, emails are printed to the server log, for development.
- Hosting, cron and cookieless Web Analytics on **Vercel** (URLs are redacted before sending — see `src/components/analytics.tsx`)

## Code map

```
src/
  app/
    page.tsx                     homepage, the full pitch (marketing template, "home" config)
    for/[slug]/[variant]/        single-screen ad pages per audience (static); for/ = design gallery
    robots.ts, sitemap.ts        only / and /for/* are indexable
    login/, auth/verify/         magic-link sign-in (GET shows a button; POST consumes the token, so email scanners can't burn it)
    welcome/                     asks new users for their name
    (app)/dashboard|items|contacts|settings|preview   signed-in area
    check-in/                    one-click "I'm OK" from reminder emails
    access/[token]/              what a contact sees after release
    api/cron/check-switches/     daily job
    api/health/                  config self-check (booleans only)
    actions/                     server actions (all re-check session + ownership)
  lib/
    switch.ts                    dead man's switch state machine (evaluateSwitch is pure)
    auth.ts  crypto.ts  email.ts  vault.ts  items.ts  config.ts
  marketing/ads/                 one component per ad design + registry of audiences (index.ts)
  marketing/pages/home.ts        homepage copy
  components/marketing/          homepage template, CTA link that carries attribution
  db/schema.ts                   Drizzle schema
drizzle/                         SQL migrations (applied automatically by `npm run build`)
e2e/full-flow.mjs                end-to-end test of the whole lifecycle
```

## Local development

```bash
cp .env.example .env.local      # set DATABASE_URL, ENCRYPTION_KEY, CRON_SECRET
npm install
npm run db:migrate
npm run dev
```
Emails (including sign-in links) are printed to the terminal when no email provider is configured.

### Changing the database schema
Edit `src/db/schema.ts`, then run `npm run db:generate`, and commit the new file in `drizzle/`. It is applied on the next deploy.

### End-to-end test
Runs the full lifecycle (sign-up → items → contacts → per-contact sharing → switch → simulated missed check-ins → release → recipient view → revoke → delete account) against a production build:
```bash
npm run build && npm start > /tmp/server.log 2>&1 &
set -a; . ./.env.local; set +a
SERVER_LOG=/tmp/server.log node e2e/full-flow.mjs     # needs Playwright installed globally (NODE_PATH)
```

### Ad pages fit on one screen
```bash
node e2e/ads-fit.mjs   # every ad design × 8 screen sizes: no scrolling, button visible
```

### Live smoke test
Checks a deployed site without needing any secrets: health, redirects, security headers, auth guards, cron protection, a real sign-in email sent to Resend's test inbox (`delivered@resend.dev`), and rejection of bad links.
```bash
BASE_URL=https://www.looseends.life node e2e/live-smoke.mjs   # add NODE_USE_ENV_PROXY=1 behind an HTTP proxy
```

## Security notes
- Item contents and personal messages are encrypted at rest (AES-256-GCM, key derived from `ENCRYPTION_KEY`). Names and emails of contacts are not, because they're needed to send email.
- Login, session, and access tokens are random 256-bit values. Only their SHA-256 hashes are stored.
- Users are told not to store passwords, only *where* things are.
- `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and `noindex` on every page.

## Ideas for next iterations
- Second factor for recipients (email code) before showing the vault
- Optional "waiting period" after release, during which the owner gets one last chance
- SMS / second-email check-in channels
- Importing subscriptions from email (out of scope for v1)
- Attachments (documents, photos)
