# Loose Ends

**https://www.looseends.life** · *Tie up your loose ends.*

A private "dead man's switch" vault. People record their subscriptions, bank accounts, investments, insurance, online accounts and personal messages, and choose trusted contacts. If they stop answering periodic check-in emails, each contact receives a private link to exactly what was shared with them.

**Deploying for the first time? → see [SETUP.md](./SETUP.md).** · **Landing pages & ads → see [MARKETING.md](./MARKETING.md).**

## How it works

1. **Sign in with email**: passwordless magic links. Signing up and signing in are the same flow.
   **Subscription required**: new accounts land on `/subscribe` (one plan, €39/$39 a year, Paddle checkout) before anything else.
   New subscribers then go through **onboarding** (`/onboarding`), until they finish or skip it (`users.onboarded_at`). It has 3 phases: (1) name, a message and one-tap subscriptions, plus audience-specific suggestions for people who arrived from an ad (`src/lib/onboarding.ts`); (2) trusted contacts, with no emails sent yet; (3) choose email check-ins or contacts claim, which switches it on and sends the matching emails. Progress is derived from saved data, so a reload resumes at the right phase.
2. **Vault**: items of 8 kinds (subscription, bank, investment, crypto wallet, insurance, online account, other, message). Each item is just a name, one "how to find it" field (account email, last digits, policy number…) and free-text notes, with an ideas tooltip (`src/lib/items.ts`). Contents are encrypted with AES-256-GCM before being stored.
   Everything is seen, added and edited on **one page**, `/vault`. The selection lives in the URL (`?item=<id>` / `?new=<kind>`), so switching is instant and back/forward work. The dashboard shows a compact overview.
3. **Trusted contacts**: name, email, optional personal message (also encrypted). Each item is shared with *everyone* or *selected contacts*.
4. **Release switch**: the owner picks one of two modes (never both), in Check-in & settings:
   - **Email check-ins** (`checkin`): every N days (7–180) the owner must check in. Overdue → status `warning` and reminders every 1–3 days for the grace period (3–30 days) → `triggered`: each contact gets an email with a personal `/access/<token>` link, and the owner gets a notice.
   - **Trusted contacts claim** (`claim`): no scheduled emails. Each contact is emailed a personal `/claim/<token>` link. Requesting access sets status `warning` and emails the owner (with reminders). If the owner doesn't reject within the grace period, the vault is released to all contacts. One claim at a time; rejecting tells the contact.
   - **Automatic check-in**: any signed-in visit counts (at most once an hour). In check-in mode it resets the timer and stops reminders. In claim mode it never cancels a pending claim (someone could be using the owner's signed-in device); the owner must press "I'm OK — reject".
   - After a release, the owner can sign in and **revoke & reset**, which invalidates all access links.
5. A daily Vercel Cron (`vercel.json`) calls `/api/cron/check-switches` (protected by `CRON_SECRET`).
6. **Billing** (`src/lib/billing.ts`, rules in `billing-rules.ts`, unit-tested). Paddle is the merchant of record: it charges customers and handles EU VAT, US sales tax, invoices and refunds.
   - Access levels: **member** (`active`, `trialing`, `past_due` while Paddle retries a failed payment) = full use; **frozen** (subscription `canceled`/`paused`) = vault and contacts read-only, but the **release switch keeps running** (when someone dies their card stops working; their instructions must still arrive), and the owner can still check in, turn the switch off, renew or delete the account; **none** (never subscribed) = only `/subscribe`.
   - Paddle's webhook (`/api/paddle/webhook`, HMAC-verified) is the source of truth. Right after checkout the subscribe page also asks the server to fetch the transaction from Paddle's API, so access starts at once. Late or out-of-order webhooks are ignored (`shouldApply`), and an old subscription ending never removes the access a newer one gives.
   - Deleting an account cancels its subscription first; if Paddle can't be reached, nothing is deleted.
   - The subscribe page is the only page whose Content-Security-Policy allows Paddle's script and checkout iframe; it reloads itself if reached by in-app navigation.

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
    onboarding/                  first-time setup in 3 phases (vault, people, release mode)
    (app)/dashboard|vault|contacts|settings|preview   signed-in area (vault = one-page editor)
    check-in/                    one-click "I'm OK" from reminder emails
    access/[token]/              what a contact sees after release
    api/cron/check-switches/     daily job
    api/health/                  config self-check (booleans only)
    api/paddle/webhook/          Paddle subscription events (signature-verified)
    subscribe/                   the paywall: Paddle overlay checkout, then confirmation
    terms/, privacy/, refunds/   legal pages Paddle requires (operator from LEGAL_NAME / LEGAL_ADDRESS)
    actions/                     server actions (all re-check session + ownership)
  lib/
    switch.ts                    dead man's switch state machine (evaluateSwitch is pure)
    billing.ts                   Paddle API + webhook handling; billing-rules.ts = access levels, signatures, ordering (pure)
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
Runs the full lifecycle (sign-up → paywall → signed Paddle webhooks → items → contacts → per-contact sharing → switch → simulated missed check-ins → release → recipient view → revoke → delete account) against a production build:
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
- **Encryption at rest:** item contents and personal messages use AES-256-GCM, with the key derived from `ENCRYPTION_KEY`. Contacts' names and emails are not encrypted, because they're needed to send email.
- **Tokens:** login, session, check-in, claim and access tokens are random 256-bit values. Only their SHA-256 hashes are stored; the check-in token is stored encrypted, so reminders can be re-sent.
- **Authorization:** every server action checks the session, and every query is limited to the signed-in user's rows. Next.js checks the Origin header on server actions, which protects against CSRF.
- **Rate limits** (`src/lib/rate-limit.ts`, a Postgres `rate_limits` table):
  - Sign-in emails: per address, per client IP, and a site-wide limit.
  - Emails a user can trigger (contact notifications, claim links, resends, test reminders): a daily cap.
  - Claims: a limit per trusted contact.
- **Headers:**
  - `Content-Security-Policy`: same-origin only; `frame-ancestors 'none'`, except the ad pages, which the `/for` gallery frames.
  - Also `X-Frame-Options`, `Referrer-Policy: no-referrer`, `nosniff`, and `noindex` on private pages.
- **Payments:** we never see card details (Paddle's iframe). Webhooks are verified with HMAC-SHA256 over `ts:body` and a 5-minute clock window; customer data in a checkout is only trusted to link a subscription to the user who started it.
- **Analytics** only ever receive URLs with tokens and IDs removed (`src/components/analytics.tsx`).
- **Release switch safety** (`src/lib/switch.ts`, rules in `switch-rules.ts`, unit-tested):
  - Each user is re-read right before acting, and every state change is compare-and-set. A check-in that happens during the cron run can't be overridden by a release.
  - Nothing is released until a reminder has actually been delivered. The first delivered reminder starts the grace period.
  - A short lease prevents overlapping cron runs, and each contact is claimed before their release email, so nobody gets two emails.
  - Contacts added after a release never receive access.
- **Never stored:** passwords, PINs and seed phrases. Users are told to write down *where* things are.

### Schema changes and deployments
- Migrations run only for **production** builds (`scripts/migrate.mjs`). Preview deployments share production's environment variables, including its database, so they must never migrate it.
  - Better still: enable *"Create a database branch for each preview"* in the Neon integration, so previews get their own copy.
- The old deployment keeps serving until the new one is live, so schema changes must be **backward compatible**. Add columns or tables first; remove or rename them in a *later* deploy, once no running code uses them.

## Ideas for next iterations
- Second factor for recipients (email code) before showing the vault
- Optional "waiting period" after release, during which the owner gets one last chance
- SMS / second-email check-in channels
- Importing subscriptions from email (out of scope for v1)
- Attachments (documents, photos)
