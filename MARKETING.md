# Marketing: single-screen ad pages

Each ad audience gets a **single-screen ad page**: one full-screen poster with no scrolling, styled for that audience. Its only button leads to the normal homepage (`/`), which explains the product in full and has the sign-up button.

```
ad (Meta/Google/…)  →  /for/<audience>  →  /  (homepage, full pitch)  →  /login  →  /welcome  →  audience's first step
                       one screen, one button        attribution (from + utm_*) is carried through every step
```

## Compare the designs: **https://www.looseends.life/for**
The gallery shows every design alternative live, at desktop and phone size, with links.

| Audience | Ad URL (default design) | Alternatives |
|---|---|---|
| Older adults (family letters) | `/for/family` | `/for/family/a` The letter · `/b` Golden hour · `/c` Garden |
| Young investors | `/for/investors` | `/for/investors/a` Money map · `/b` Bright fintech · `/c` Electric poster |
| Crypto self-custody | `/for/crypto` | `/for/crypto/a` Terminal · `/b` Split knowledge · `/c` Orange pill |

- `/for/<audience>` shows the **default** design (`defaultVariant` in `src/marketing/ads/index.ts`). To pick a winner, change that one letter.
- Only `/for/<audience>` is indexed by search engines. The alternative URLs are `noindex`, so they can also be used for A/B tests: point two ads at `/for/crypto/a` and `/for/crypto/c` with different `utm_content`.
- New users from an ad start at their audience's first step (`startHref`), for example "write a letter" for family.

## Add a design alternative or a new audience
1. Copy one of `src/marketing/ads/<audience>-<x>.tsx` (for example `crypto-c.tsx`) to a new file. Each file is the whole ad: copy, colours, fonts and visual.
2. Build it inside `<AdFrame>` (logo bar, centred content, footer) and use `<AdCta from={from}>` for the button, so attribution keeps working.
   - Use `fitHeadline` for the headline and `visualWhenRoom` on the visual, so it fits on one screen on short phones.
   - Fonts per audience live in `fonts.ts`: Fraunces/Caveat (family), Space Grotesk (investors), JetBrains Mono (crypto).
3. Register it in `src/marketing/ads/index.ts`: add it to an audience's `variants`, or add a new audience with `slug`, `startHref` and `defaultVariant`.
4. Check it fits on one screen at 8 phone, tablet and desktop sizes:
   ```bash
   npm run build && npm start &
   node e2e/ads-fit.mjs          # BASE_URL=https://www.looseends.life to check production
   ```

## Ad URLs
```
https://www.looseends.life/for/crypto?utm_source=meta&utm_medium=paid&utm_campaign=crypto-nov&utm_content=terminal
```
The audience (`from=crypto`) and the `utm_*` values are passed from the ad page to the homepage to sign-up, and stored on the new account in `users.signup_source` and `users.signup_campaign`. Existing users who sign in again are never re-attributed.

## Traffic: Vercel Web Analytics
Vercel → project → **Analytics** (cookieless). Funnel per audience:
1. Views of `/for/crypto`: people who arrived from the ad.
2. Views of `/?from=crypto`: people who clicked the ad's button.
3. Views of `/login?from=crypto`: people who clicked "Create your free vault" on the homepage.
4. Views of `/welcome`: completed signups. For exact numbers per audience and campaign, use the SQL below.

URLs are cleaned in `src/components/analytics.tsx` before sending: tokens, record IDs and all query parameters except `from` and `utm_*` are removed. If you add a route whose URL contains anything private, add it there and to `src/components/analytics.test.ts` (`npm run test:unit`).

## See which audiences convert
In the Neon console (Vercel → Storage → your database → **Open in Neon** → SQL Editor):

```sql
-- Signups per audience, last 30 days
select coalesce(signup_source, 'homepage') as audience, count(*) as signups
from users where created_at > now() - interval '30 days'
group by 1 order by 2 desc;

-- Signups per ad campaign / creative
select signup_source, signup_campaign, count(*) from users
where signup_campaign is not null group by 1, 2 order by 3 desc;

-- How far people get: signed up → added an item → turned the switch on
select coalesce(u.signup_source, 'homepage') as audience,
       count(*) as signups,
       count(*) filter (where exists (select 1 from items i where i.user_id = u.id)) as added_item,
       count(*) filter (where u.switch_enabled) as switch_on
from users u group by 1 order by 2 desc;
```

## Copy guidelines
- One screen, one worry, one button. If it needs scrolling, it's too long.
- Speak the audience's language: warm and large type for older people, fintech for investors, terminal and self-custody language for crypto.
- Make no claims we can't back up: no invented statistics, testimonials or "bank-grade" phrases. Mock content uses invented names and **no real brands**.
- Never suggest storing passwords, PINs or seed phrases. Always say "where things are", not the secrets themselves.
