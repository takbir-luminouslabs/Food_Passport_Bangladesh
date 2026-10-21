# Food Passport Bangladesh

A guest-first web app for exploring the famous food of every district of Bangladesh. Try a food, collect a stamp in
your passport, earn XP, badges and challenges, then share or download your passport as an image or PDF.
Bangla and English. No account needed: everything is stored in your browser.

React 19 · Vite · Tailwind CSS v4 · React Router (HashRouter) · Vitest.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component + accessibility tests
npm run lint
npm run build      # production build in dist/
```

## Content

The catalogue is static JSON in [public/data](public/data): `foods.json`, `categories.json`, `challenges.json`,
`badges.json`. Every district has exactly one (its most popular) food, 64 in all. XP, levels, badges and challenges are always
*derived* from which foods a person has tried, never stored, so progress cannot be farmed or drift out of sync.

All foods are marked `unverified` until someone checks them, and 28 have `association_confidence: "low"`. Please
verify these before a public launch (see "Before you launch").

## Settings

Copy [.env.example](.env.example) to `.env.local`. Every value is optional, and every `VITE_*` value is **public**
(it is compiled into the browser bundle), so never put a real secret here.

| Variable | What it does |
| --- | --- |
| `VITE_SITE_URL` | The public address of the site, used in share links and printed on the card. |
| `VITE_BKASH_NUMBER` | Shows the optional donation number. Leave it empty until the number is verified (see below). |
| `VITE_BASE` | Base path when hosted in a sub-folder. Set by the deploy workflow; defaults to `/`. |

### The bKash number

The donation block says "coming soon" until `VITE_BKASH_NUMBER` holds a valid Bangladeshi mobile number
(`01XXXXXXXXX`, `+8801XXXXXXXXX` also accepted). Anything else (a typo, a placeholder) is ignored. **Only enter the
number after you have confirmed it is the right account**, for example by sending a small test amount. The app
never asks for a PIN or OTP and never claims a payment was received.

## Deploy to GitHub Pages

1. Push the project to a GitHub repository whose default branch is `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Optional: **Settings → Secrets and variables → Actions → Variables** and add `SITE_URL` (for example
   `https://<user>.github.io/<repository>/`) and, once verified, `BKASH_NUMBER`.
   Use *variables*, not secrets: these values are public anyway.
4. Push to `main`. [The workflow](.github/workflows/deploy.yml) runs lint and tests, builds with
   `VITE_BASE=/<repository>/`, and publishes `dist/`.

Routing uses `HashRouter` (`/#/passport`), so deep links and refreshes work on GitHub Pages without any server
rewrite rules. For a `<user>.github.io` repository (served from the domain root) change `VITE_BASE` in the workflow to `/`.

## Privacy

Progress is saved in this browser's LocalStorage. Nothing is uploaded: not progress, not the name typed on the
card, and not the optional photo (which stays in memory, is re-drawn to drop location metadata, and is forgotten on
reload). Share links to WhatsApp, Facebook and X contain only a sentence with the stamp count and the site address,
and nothing is sent to them until you click. See the in-app Privacy page.

## Accessibility

- Skip link, one `h1` per page, landmarks, visible focus rings, 44px touch targets.
- Each page change updates the document title, announces the new page and moves focus to the content.
- Loading, empty and error states have text, not just colour or spinners; a crash shows a reload button.
- `prefers-reduced-motion` turns off animation, including the card tilt and page effects.
- Automated checks: [src/a11y.test.jsx](src/a11y.test.jsx) runs axe on every page in both languages.

## Project layout

```
public/data/        static catalogue (JSON)
src/utils/          pure logic: scoring, XP, rules, share card + PDF drawing, exports
src/components/     UI (passport book, stamps, share card, ...)
src/pages/          routes
src/context/        app state, holder name/photo (memory only)
src/data/           bilingual strings
.github/workflows/  Pages deployment
```

## Before you launch

- [ ] Verify the 28 low-confidence foods (and ideally all 64) and update `verification_status` / `association_confidence`.
- [ ] Add real food photos with their credits (`image_url`, `image_attribution`), or keep the designed fallbacks.
- [ ] Set `SITE_URL`; set `BKASH_NUMBER` only after verifying it.
- [ ] Test on a real phone.

## Cloud backend (Supabase) — in progress

The site works fully without it. The optional cloud features (accounts, sync, leaderboard) live in `supabase/`:

- `supabase/migrations/` — the database schema, row level security and grants (PRD section 9).
- `supabase/seed.sql` — the foods, challenges and badges, **generated** from `public/data/*.json` (`npm run db:seed`; a test fails if it is stale).
- `supabase/tests/` — permission tests. `npm run db:test` starts a throwaway Postgres in Docker, applies the migrations and checks, with two fake accounts, that nobody can read or change another user's data or write XP directly.

To set up a real project: create it in Supabase, then run the migration files in order and `seed.sql` in the SQL editor (or `supabase db push`). Put the project URL and publishable key in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put the `service_role` key in this repo or in the browser.

### Accounts (sign in with an email link)

Accounts are off until `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set (locally in `.env`, for the live site as GitHub Actions variables). Without them the site is the plain guest passport and no sign-in button appears.

In the Supabase dashboard (Authentication → URL Configuration) add the site address as the **Site URL** and as a **Redirect URL**, for example `https://<user>.github.io/<repository>/` and `http://localhost:5173/` for development. Email sign-in is on by default. The sign-in link returns as `?code=…` before the `#/` route (PKCE flow), so it does not clash with the hash router.

The free Supabase email sender is rate limited and only meant for testing; before real users arrive, add your own SMTP provider under Authentication → SMTP Settings.

### Guest → account merge and sync

On sign-in the site compares this browser's passport with the account's. If the browser holds stamps or right quiz answers the account lacks, it asks first, then calls `merge_guest_progress` (migration 4). The merge is a **union**: it only adds, never deletes or lowers anything, is safe to repeat, and pays XP by the same once-only rules as ticking one by one. Afterwards ticks and un-ticks are pushed to the account, and the account is re-read when the tab regains focus so progress follows you between devices. Choosing "Not now" leaves both sides untouched. The merged ids are the guest's own claims (a stamp has always been a self-reported tick); unknown ids are ignored and each food or question pays once.

### Profile, leaderboard opt-in and moderating names

Signed-in people can set a display name and switch "Show me on the leaderboard" on (off by default). Both go through `set_my_profile` (migration 5); users have no direct UPDATE right on `profiles`. The server enforces 2-24 characters, Latin letters, digits, Bangla, space and `. _ -` only, no web addresses or phone numbers, and the private `blocked_terms` list (matched after ignoring case, spacing, punctuation and digit-for-letter swaps). Opting in needs a name.

Reporting: `report_display_name(user_id)` (the leaderboard will call it). Three different reporters hide a name automatically (`profiles.name_hidden`), and the leaderboard must skip hidden names. Review in the Supabase SQL editor (service role):

```sql
-- see what is waiting
select user_id, display_name from profiles where name_hidden;
-- allow it again
update profiles set name_hidden = false where user_id = '...'; delete from name_reports where reported_id = '...';
-- remove it for good
update profiles set display_name = null, leaderboard_opt_in = false, name_hidden = false where user_id = '...';
-- block a new word (lower case; Latin letters or Bangla only)
insert into blocked_terms (term) values ('someword');
```

### Leaderboard

`/leaderboard` calls `get_leaderboard(limit, offset)` (migration 6; 50 per page, readable by signed-out visitors) and, for signed-in people, `my_leaderboard_rank()`. Only opted-in, not-hidden profiles with a name are listed. Each row has only rank, a random public handle (used for reports), display name, XP, stamps and badges; never an email or account id. Order: more XP first; equal XP, whoever reached it first (time of the latest XP-earning event) ranks higher. The page is worded as a community progress ranking, not an eating competition.

### Going live (checklist)

1. **Supabase project**: create one, then in the SQL editor run `supabase/migrations/*.sql` in order (1 to 7) and finally `supabase/seed.sql`. (Or `supabase link` + `supabase db push`, then run the seed.)
2. **Auth settings** (Authentication → URL Configuration): Site URL = the live address, e.g. `https://<user>.github.io/<repository>/`; add the same and `http://localhost:5173/` as Redirect URLs. Add your own SMTP provider under SMTP Settings before real users arrive.
3. **GitHub**: Settings → Secrets and variables → Actions → **Variables**: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). They are variables rather than secrets on purpose: both end up in the public JavaScript bundle by design, and security comes from the row level security tests, not from hiding them. **Never add the `service_role` key anywhere in the repo or the workflow.** Also set `SITE_URL` (and `BKASH_NUMBER` once verified).
4. Push to `main`. The workflow runs lint, the site tests and `npm run db:test` (the permission tests on a throwaway Postgres in Docker); only if all pass does it build and publish.
5. Smoke test on the live site with two real emails: sign in, tick a food, check the other account cannot see it, opt into the leaderboard, delete the test accounts.
