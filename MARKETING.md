# Marketing landing pages

Each ad audience gets its own landing page at **`https://www.looseends.life/for/<slug>`**. The product is the same for everyone; only the pitch changes. The page and any ad (UTM) parameters are recorded on each new account, so you can see which page and which ad brings signups.

| Page | Audience | Leads with | New users start at |
|---|---|---|---|
| [`/for/family`](https://www.looseends.life/for/family) | Older adults, and their adult children | The last letter to family | Writing a message |
| [`/for/investors`](https://www.looseends.life/for/investors) | Young professionals investing via apps | Scattered accounts nobody knows about | Adding an investment |
| [`/for/crypto`](https://www.looseends.life/for/crypto) | Self-custody crypto holders | Recovery map, never seed phrases | Adding a crypto wallet |
| [`/`](https://www.looseends.life) | Everyone else (organic) | The general pitch | Dashboard |

`/for` lists every landing page. It is not indexed by search engines; use it to review pages and copy URLs.

## Why paths and not subdomains
- **One domain to rank in search:** every page builds up `looseends.life` instead of splitting it across subdomains.
- **Sign-in just works:** cookies and the session are shared without extra setup.
- **Nothing to configure:** no DNS, certificates or Vercel domain per page. A new page is one file.
- **Fast:** pages are generated as static HTML at build time, so ad clicks load instantly.

## Add a new landing page (about 15 minutes)
1. Copy `src/marketing/pages/investors.ts` to `src/marketing/pages/<slug>.ts` and rename the export.
2. Rewrite the copy. Every field is documented in `src/marketing/types.ts`:
   - `hero`: the headline, the button text and three short reassurances.
   - `preview`: the mock "what your contact receives" card. Use invented names and **no real brand names**.
   - `problem`: three pains. `features`: four benefits. `faq`: questions specific to this audience. The shared FAQs are added automatically; give a question the same `id` (e.g. `"safety"`) to replace a shared one.
   - `startHref`: where new users go after sign-up, e.g. `/items/new?kind=message`.
3. Add it to `LANDING_PAGES` in `src/marketing/index.ts`.
4. Push. The page is live at `/for/<slug>` after the deploy, and it's added to the sitemap automatically.

## Ad URLs
Add standard UTM parameters to the landing page URL in your ad:

```
https://www.looseends.life/for/crypto?utm_source=meta&utm_medium=paid&utm_campaign=crypto-nov&utm_content=video-a
```

The sign-up button carries the page slug and the `utm_*` values through sign-up. On account creation they're stored in `users.signup_source` (for example `crypto`) and `users.signup_campaign` (for example `utm_source=meta&utm_campaign=crypto-nov`). Existing users who sign in again are never re-attributed.

## See which pages convert
In the Neon console (Vercel → Storage → your database → **Open in Neon** → SQL Editor):

```sql
-- Signups per landing page, last 30 days
select coalesce(signup_source, 'homepage') as page, count(*) as signups
from users where created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- Signups per ad campaign
select signup_source, signup_campaign, count(*) from users
where signup_campaign is not null group by 1, 2 order by 3 desc;

-- How far people get: signed up → added an item → turned the switch on
select coalesce(u.signup_source, 'homepage') as page,
       count(*) as signups,
       count(*) filter (where exists (select 1 from items i where i.user_id = u.id)) as added_item,
       count(*) filter (where u.switch_enabled) as switch_on
from users u group by 1 order by 2 desc;
```

## Copy guidelines
- Speak to one person, about one worry. The product is the same; the *first reason to care* is different.
- Make no claims we can't back up: no invented statistics, testimonials or "bank-grade" phrases.
- Never suggest storing passwords, PINs or seed phrases. Always say "where things are", not the secrets themselves.
