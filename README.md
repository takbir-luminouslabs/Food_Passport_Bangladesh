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
`badges.json`. Every food belongs to a district (all 64 are covered). XP, levels, badges and challenges are always
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

- [ ] Verify the 28 low-confidence foods (and ideally all 71) and update `verification_status` / `association_confidence`.
- [ ] Add real food photos with their credits (`image_url`, `image_attribution`), or keep the designed fallbacks.
- [ ] Set `SITE_URL`; set `BKASH_NUMBER` only after verifying it.
- [ ] Test on a real phone.
