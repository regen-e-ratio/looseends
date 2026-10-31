# Setup guide: deploy Afterword (one-time, about 30–45 minutes)

You only do this once. After that, every change pushed to the `main` branch on GitHub deploys automatically, and the database schema updates itself during the deploy.

## The services and why each one was chosen

| Need | Service | Cost to start | Why this one |
|---|---|---|---|
| Code hosting | **GitHub** (you already have it) | Free | Vercel deploys straight from it |
| Hosting + daily job | **Vercel** (Hobby plan) | Free | Made for Next.js. Its built-in *Cron Jobs* run our daily "has this person checked in?" check, so we don't need a separate scheduler |
| Database | **Neon Postgres**, added *through* Vercel | Free tier | One click inside Vercel. It creates the database and sets `DATABASE_URL` for you |
| Email | **Resend** | Free tier (about 3,000 emails/month) | Simplest API, good deliverability, and its dashboard shows every email sent |
| Email domain | Any domain you own (for example `afterword-yourname.com`) | About $10/year | **Required by Resend to email anyone other than yourself.** Contacts must receive emails from a real domain or the emails land in spam |

> ⚠️ Vercel's free Hobby plan is for **personal, non-commercial** use. If you start charging users, upgrade to Pro ($20/month). No code changes are needed.

---

## Step 1: GitHub repository
1. Go to https://github.com/new
2. **Repository name:** `afterword`. **Visibility:** Private. **Do not** add a README, .gitignore or license, so the repo stays empty.
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
2. **Add New… → Project** → import the `afterword` repository. If it's not listed, click *Adjust GitHub App Permissions* and grant access to it.
3. Leave all build settings at their defaults. Open **Environment Variables** on the same screen and add:

   | Name | Value |
   |---|---|
   | `ENCRYPTION_KEY` | SECRET A |
   | `CRON_SECRET` | SECRET B |
   | `RESEND_API_KEY` | the `re_…` key from Resend |
   | `EMAIL_FROM` | `Afterword <hello@yourdomain.com>` (must use the domain you verified in Resend) |

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

That's it. 🎉

---

### Option B: Gmail instead of Resend (no domain needed)
1. Turn on 2-Step Verification on the Google account, then create an App Password at https://myaccount.google.com/apppasswords.
2. In Vercel, **don't** set `RESEND_API_KEY`. Set these instead:
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`, `EMAIL_FROM=Afterword <you@gmail.com>`.

Gmail limits you to about 500 emails/day and is more likely to land in spam, so treat it as a stopgap.

### Optional: let Claude manage Vercel directly
Right now Claude's cloud sandbox can only reach GitHub. Pushing to GitHub is enough to deploy. If you also want Claude to read deploy logs or change environment variables itself:
1. Create a token at https://vercel.com/account/settings/tokens.
2. In the Claude Code environment settings, add it as `VERCEL_TOKEN`, and add `api.vercel.com` and `*.vercel.app` to the allowed network domains.
3. Start a new session.
