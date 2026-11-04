# Setup guide: deploy Loose Ends (one-time, about 30–45 minutes)

You only do this once. After that, every change pushed to the `main` branch on GitHub deploys automatically, and the database schema updates itself during the deploy.

## The services and why each one was chosen

| Need | Service | Cost to start | Why this one |
|---|---|---|---|
| Code hosting | **GitHub** (you already have it) | Free | Vercel deploys straight from it |
| Hosting + daily job | **Vercel** (Hobby plan) | Free | Made for Next.js. Its built-in *Cron Jobs* run our daily "has this person checked in?" check, so we don't need a separate scheduler |
| Database | **Neon Postgres**, added *through* Vercel | Free tier | One click inside Vercel. It creates the database and sets `DATABASE_URL` for you |
| Email | **Resend** | Free tier (about 3,000 emails/month) | Simplest API, good deliverability, and its dashboard shows every email sent |
| Email domain | Any domain you own (we use `looseends.life`) | About $10/year | **Required by Resend to email anyone other than yourself.** Contacts must receive emails from a real domain or the emails land in spam |
| Payments | **Paddle** (merchant of record) | No monthly fee; 5% + $0.50 per payment | Paddle sells to your customers on your behalf: it charges cards, and calculates, collects and files **EU VAT and US sales tax** for you, sends invoices and handles refunds and chargebacks. Stripe is cheaper per payment but leaves tax registration and filing in every EU country and US state to you |

> ⚠️ Vercel's free Hobby plan is for **personal, non-commercial** use. Upgrade to Pro ($20/month) before you start charging (Step 7). No code changes are needed.

---

## Step 1: GitHub repository
1. Go to https://github.com/new
2. **Repository name:** `looseends`. **Visibility:** Private. **Do not** add a README, .gitignore or license, so the repo stays empty.
3. Click **Create repository**.
4. Tell Claude that it's created. Claude pushes the code.

## Step 2: Generate two secrets
You need two long random strings. Generate each one **separately**:

- **Mac or Linux terminal:** run `openssl rand -base64 32`
- **Any browser:** open the developer console (F12 → Console) and run `crypto.randomUUID() + crypto.randomUUID()`

Call them **SECRET A** (encryption key) and **SECRET B** (cron secret).

> 🔐 Store **SECRET A** in your password manager. It encrypts every vault. If you lose or change it, all stored data becomes unreadable. Never paste it into a chat.

## Step 3: Email with Resend
1. Sign up at https://resend.com.
2. **Domains → Add Domain** and enter your domain. You can use a subdomain such as `mail.yourdomain.com`.
3. Resend shows some DNS records (TXT/MX). Add them where your domain's DNS is managed (Vercel, Cloudflare, Namecheap…). Wait until Resend shows the domain as **Verified**. This usually takes minutes, occasionally a few hours.
4. **API Keys → Create API Key**. Choose permission **Sending access**. Copy the key (it starts with `re_`).

> No domain yet? You can still finish everything and test, but Resend will only deliver to **your own** Resend account email. Login links to you will work; emails to contacts won't, until you verify a domain. (Alternative without a domain: Gmail SMTP with an App Password. See "Option B" at the end.)

## Step 4: Vercel project and database
1. Sign up at https://vercel.com with **Continue with GitHub**.
2. **Add New… → Project** → import the `looseends` repository. If it's not listed, click *Adjust GitHub App Permissions* and grant access to it.
3. Leave all build settings at their defaults. Open **Environment Variables** on the same screen and add:

   | Name | Value |
   |---|---|
   | `ENCRYPTION_KEY` | SECRET A |
   | `CRON_SECRET` | SECRET B |
   | `RESEND_API_KEY` | the `re_…` key from Resend |
   | `EMAIL_FROM` | `hello@looseends.life` (must use the domain you verified in Resend) |
   | `APP_NAME` | *(optional)* defaults to `Loose Ends`; shown in the site and as the email sender name |

4. Click **Deploy**. **The first deploy fails with "DATABASE_URL is not set". That's expected**, because there's no database yet.
5. In the project, open the **Storage** tab → **Create Database** → **Neon** (Serverless Postgres) → pick the region closest to your users → accept the defaults → **Connect** it to the project, for all environments. This adds `DATABASE_URL` automatically.
6. Go to **Deployments** → on the failed deployment click **⋯ → Redeploy**. The build now creates the database tables and succeeds.

## Step 5: (Optional) Custom domain
Project → **Settings → Domains** → add `yourdomain.com` (or `app.yourdomain.com`), and follow the DNS instructions. Then add the environment variable `APP_URL` = `https://yourdomain.com` and redeploy, so links in emails use your domain. Without this, links use the `*.vercel.app` address, which works fine.

## Step 6: Check it works
1. Open `https://<your-project>.vercel.app/api/health`. You should see `"ok": true`. If a value is `false`, that is the setting to fix.
2. Open the site, sign up with your email, and click the link you receive.
3. Go to **Check-in & settings** → **Send me a test reminder email**.
4. In Vercel → **Settings → Cron Jobs**, you should see `/api/cron/check-switches` scheduled daily.

## Step 7: Payments with Paddle
Every account needs a subscription. Until the four `PADDLE_*` variables below are set, the subscribe page says "Subscriptions open very soon" and nobody can get past it.

### 7a. Test with Paddle's sandbox (about 20 minutes, no approval needed)
The sandbox is a separate Paddle account where nothing is real: test cards, no money.

1. Sign up at https://sandbox-login.paddle.com/signup.
2. **Tax settings:** Paddle → *Business account* → *Tax* (or *Checkout settings*): set the default tax mode to **based on location**. EU customers then see prices with VAT included (€39 means €39), and US customers see sales tax added at checkout, as each expects.
3. **Product and price:** *Catalog → Products → New product*
   - Name: `Loose Ends` · Tax category: **Standard digital goods** (or **SaaS** if offered)
   - *New price*: Billing **yearly** (every 1 year) · Base price **EUR 39.00** · Tax mode **Account setting** · no trial (optional: add one; trials work too)
   - *Price overrides → add country*: **United States → USD 39.00**
   - Save and copy the price ID (`pri_…`).
4. **Default payment link:** *Checkout → Checkout settings → Default payment link* = `https://www.looseends.life/subscribe`.
5. **API key:** *Developer tools → Authentication → API keys → New API key*.
   - Permissions: read & write for **Subscriptions**, **Customers** and **Customer portal sessions**; read for **Transactions**.
   - Expiry: choose the **longest** option and put the expiry date in your calendar. When the key expires, the "Manage subscription" button and cancelling on account deletion stop working until you replace it (payments and webhooks keep working).
   - Copy the key (`pdl_sdbx_apikey_…`).
6. **Client-side token:** same page → *Client-side tokens → New* → copy it (`test_…`).
7. **Webhook:** *Developer tools → Notifications → New destination*
   - URL: `https://www.looseends.life/api/paddle/webhook` (the `www.` address: the bare domain redirects, and webhooks don't follow redirects)
   - Events: all **subscription.\*** events (created, updated, activated, canceled, past_due, paused, resumed, trialing) and **transaction.completed**
   - Save, then copy the **secret key** (`pdl_ntfset_…`).
8. **Vercel → Settings → Environment Variables** (Production), then **Redeploy**:

   | Name | Value |
   |---|---|
   | `PADDLE_CLIENT_TOKEN` | the `test_…` client-side token |
   | `PADDLE_API_KEY` | the API key |
   | `PADDLE_PRICE_ID` | the `pri_…` price ID |
   | `PADDLE_WEBHOOK_SECRET` | the notification secret key |
   | `LEGAL_NAME` | your name or company name, shown on the terms and privacy pages |
   | `LEGAL_ADDRESS` | your business address (required in the EU for the privacy notice) |
   | `SUPPORT_EMAIL` | an address you read (defaults to `support@looseends.life`, which only works if you set up forwarding for it) |

9. **Test:** `/api/health` shows `"payments": "sandbox"`. Sign up with a new email and pay with card **4242 4242 4242 4242**, any future expiry date, any CVC. You should land in onboarding within a few seconds. In *Settings → Manage subscription* you can see the invoice and cancel; Settings then says when it ends.

### 7b. Go live (Paddle reviews your account; usually a few days)
1. Upgrade Vercel to **Pro** (commercial use) and Resend to **Pro** when you expect more than 100 emails a day.
2. Sign up for a live account at https://login.paddle.com/signup and complete **verification**: business details, identity, and the bank account for payouts.
3. **Website approval:** *Checkout → Website approval* → add `looseends.life`. Paddle checks the site; everything it looks for is already live: the product description (homepage), **pricing** (`/#pricing`), **terms** naming Paddle as merchant of record (`/terms`), a **refund policy** (`/refunds`), a **privacy notice** (`/privacy`) and a contact email. Have a lawyer review those three pages: they are good drafts, not legal advice.
4. Repeat 7a steps 2–7 in the **live** dashboard (all IDs and keys are different).
5. In Vercel, replace the four `PADDLE_*` values with the live ones (the client token starts with `live_`) and redeploy. `/api/health` now shows `"payments": "production"`.
6. Buy a subscription with your own card, then refund yourself in Paddle (*Transactions → the payment → Refund*).

That's it. 🎉

---

### Option B: Gmail instead of Resend (no domain needed)
1. Turn on 2-Step Verification on the Google account, then create an App Password at https://myaccount.google.com/apppasswords.
2. In Vercel, **don't** set `RESEND_API_KEY`. Set these instead:
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`, `EMAIL_FROM=you@gmail.com`.

Gmail limits you to about 500 emails/day and is more likely to land in spam, so treat it as a stopgap.

### Optional: let Claude manage Vercel directly
Right now Claude's cloud sandbox can only reach GitHub. Pushing to GitHub is enough to deploy. If you also want Claude to read deploy logs or change environment variables itself:
1. Create a token at https://vercel.com/account/settings/tokens.
2. In the Claude Code environment settings, add it as `VERCEL_TOKEN`, and add `api.vercel.com` and `*.vercel.app` to the allowed network domains.
3. Start a new session.
