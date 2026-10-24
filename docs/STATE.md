# MeterX working state

Last updated: 2026-10-24, on `release/v2027.0.0` at `b4e5b7c` (not pushed, no PR yet).

Update this file at the end of each work session. Keep it short. Delete entries once they are done and merged.

## In progress (handoff, 2026-10-24 night)

Major release 2027.0.0 on branch `release/v2027.0.0`, planned for Sunday. Not pushed, no PR yet. The owner tests locally before the PR is opened, and merges only on their word.

Done on the branch:
- Re-architecture, full redesign (popup, side panel, settings), live test view in the side panel, side panel fits the window (results list scrolls under pinned headers).
- Exports redesigned: vector PDF (watermark, Report ID), CSV and JSON with units and a summary.
- One version source (root `package.json`, stamped into the manifest at build). No em or en dashes anywhere.
- Logo chosen: option 8, "X on a dial". `brand/build.mjs` makes every asset (icons, maskable, Edge 300 logo, 440x280 tile, 1400x560 marquee, OG and GitHub cards, five 1280x800 store screenshots) and copies icons into the extension and site. Alternates kept in `brand/alternates/` (rising bars, up/down X).
- Site `apps/site` (plan in `docs/SITE-PLAN.md`): home with live quick test, "What can X Mbps do", features with real screenshots, pinned test phases, install, FAQ; plus `/about`, `/privacy` (rewritten for #92), `/r/` share viewer (#74), `/get`, 404. Taste-skill inspector: 0 FAIL at 1440, 768, 390 (warnings: font-size count, no video).
- Worker CORS allows the site origin; quality rules moved to `@meterx/shared`.

Home page redesigned 2026-10-24 after owner feedback: centred 1120px column, hero with headline, two actions and the real popup screenshot, quick test as a secondary button with its result on a reserved line (no layout shift, checked at 1440 and 390), full-width feature rows, one proportional phase bar with four steps. Waiting for the owner's review.

Next, in order:
1. Owner checks the site locally: `cd apps/site && node build.mjs && npx wrangler pages dev dist` (or any static server on `dist`).
2. Fill the Edge and Opera listing URLs in `apps/site/src/stores.ts` (and the names on the home page).
3. Look at the phone renders of the site once more (`.taste-skill/inspect/mobile-*.jpg`, rerun the inspector from `apps/site/dist`); add a motion pass if needed.
4. Cloudflare Pages: create project `meterx-site` (free), `npm run deploy -w @meterx/site`, add custom domain `meterx.ajithakdev.com`. Write `docs/SEO.md`, add site rows to `RESOURCES-AND-GUIDE.md`.
5. Verify the scan's bug fixes against their issues (#60, #64 to #70, #73, #76 to #79, #81, #82, #85) and close them; check #61, #62, #63, #80, #87.
6. Firefox build check, README refresh (it is stale), open the PR, then on Sunday: merge on the owner's word, tag `v2027.0.0`, `wrangler deploy` the worker, upload to the stores with the `brand/png/store/` images, deploy the site, add MeterX to the portfolio.

Brand regeneration: `PLAYWRIGHT=<playwright index.mjs> CHROMIUM=<chromium> REPORT_PNG=<a PDF page png> node brand/build.mjs` after `npm run build`.

## Releases

Weekly on Sunday, like toolglass (decided 2026-10-24): patch for fixes only, minor if a feature landed; same-day patch for a broken test or security issue. Nothing deploys on merge here anyway: the worker deploys by hand with `wrangler deploy` and the stores take manual uploads, so a release is the tag, the CHANGELOG section, the GitHub release, then the worker deploy and store uploads.

## Open pull requests

None. Refresh with `gh pr list` and `gh issue list`.

## Known issues

See `docs/KNOWN-ISSUES.md`.
