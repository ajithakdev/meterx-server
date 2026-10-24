# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Links, accounts and how-tos live in [RESOURCES-AND-GUIDE.md](RESOURCES-AND-GUIDE.md). Update it in the same change when a route, link, deploy step or setting changes.

Before reading code, check `docs/CODEMAP.md` (file map with line counts and the message protocol), `docs/STATE.md` (what's in progress and next; update it at the end of each session) and `docs/KNOWN-ISSUES.md` (open bugs by area, each with a GitHub issue). A local graphify knowledge graph lives in `graphify-out/` (gitignored; rebuild with `/graphify .` if missing); for "how does X work" questions try `graphify query "<question>"` first, and run `graphify update .` after code changes.

## Commands

npm workspaces monorepo. Run from the root unless noted.

```bash
npm install
npm run build          # every workspace: extension -> apps/extension/dist, site -> apps/site/dist (needs the extension build), server -> services/server/dist
npm test               # vitest in every workspace, plus scripts/
npm run lint           # eslint (TS, CSS, Markdown)
npm run package        # store uploads in release/: one zip for Chrome, Edge and Opera, one for Firefox, and a source zip
npm run dev:site       # build and serve the site on :8788
npm run dev:ext        # build the extension and run the worker on :8787; load apps/extension/dist unpacked
npm start              # self-host Express server on :3000 (needs a prior build)

# One package
cd apps/extension && npx vitest run src/lib/quality.test.ts -t "excellent"
cd packages/reports && npx tsc --noEmit

# Worker and site deploys (free plans only)
cd services/worker && npx wrangler deploy
npm run deploy -w @meterx/site   # Cloudflare Pages project meterx-site
```

Load the extension unpacked from `apps/extension/dist/` (rebuild after every change; `static/` is copied verbatim into `dist/`). Preview the site with `npx wrangler pages dev apps/site/dist`.

## Architecture

```text
apps/extension     Manifest V3 extension (popup, side panel, settings, service worker)
apps/site          meterx.ajithakdev.com: static pages plus the extension's own pages in demo mode under /app/
services/worker    Cloudflare Worker, the default test server (streams bytes, stores nothing)
services/server    Express self-host server with the same API
packages/shared    the contract: types, API constants, version, quality rules, formatting, share links (no browser APIs)
packages/reports   PDF, CSV and JSON builders and their stats (pure; used by the extension, testable in Node)
brand/             logo masters and build.mjs, which makes every icon, store image and social card
scripts/           package-stores.mjs for store uploads
```

- **Extension** (`apps/extension`): esbuild bundles `src/background/index.ts` (service worker; measurement in `background/runner.ts` and `measure.ts`) and `src/pages/{popup,sidepanel,options}.ts`. Pages are thin: they send `chrome.runtime` messages (`startTest`, `cancelTest`, `getState`, `rescheduleTests`) and listen for `testProgress` / `testComplete` / `testError`. Browser-only helpers live in `src/lib/` (history, isp, export downloads, ui, tooltips, browser).
- **Site** (`apps/site`): `build.mjs` copies `static/`, fills the `<!-- header -->` and `<!-- footer -->` partials, and copies the built extension pages into `dist/app/` with `src/demo-shim.ts` injected before their scripts. The shim stands in for the extension APIs with labelled sample data (`src/sample.ts`); the home page drives the popup's sample test from scroll through `postMessage`. The scroll engine is `static/sc/` (scroll-craft, unmodified).
- **Worker and server**: same API, kept in sync. CORS answers extension origins, the site origin and localhost dev ports (`isAllowedOrigin` in shared).

**Server API contract**: `GET/HEAD /ping`, `GET /test-file/{1|5|10|25}MB.bin`, `POST /upload` (`application/octet-stream`, body discarded), `GET /health`, `GET /ip`. Sizes come from `ALLOWED_SIZES_MB` / `TEST_FILE_RE` in shared. Responses send `Timing-Allow-Origin` so the extension can read DNS timing.

**Measurement**: 4 download and 3 upload streams for a fixed time, ramp-up and tail trimmed, loaded-latency pings for the bufferbloat grade. The rate limits in the worker and server are sized for this burst; raise them if you add streams.

**Storage**: `chrome.storage.sync` holds settings (`serverUrl`, `ispPlan`, `scheduleMinutes`, `notifyOnDrop`); `chrome.storage.local` holds `history` (capped at 200). Scheduled tests use `chrome.alarms`.

Custom server URLs need a runtime host-permission grant (`optional_host_permissions`); the settings page requests it.

## Gotchas

- The version lives only in the root `package.json`. `@meterx/shared` exports it as `VERSION` (used by `/health`, the exports and the settings footer), and `build.mjs` stamps it into `dist/manifest.json`, so it must be 1 to 4 dot-separated numbers. Bump that one line to release.
- `manifest.json` description must stay within the store's 132-character limit.
- Store packages: Chromium stores share one zip; Firefox gets a converted manifest (sidebar, background script, id `meterx@ajithakdev`). The default worker URL is `WORKER_URL` in shared, and also sits in `host_permissions` in the extension's `static/manifest.json` and the site's `static/_headers` CSP; change all three together.
- Nothing deploys on merge. The worker (`wrangler deploy`), the site (Pages direct upload, not git-connected) and the stores are released by hand on Sunday, so docs-only merges are just merges.
- License is AGPL-3.0; see `TRADEMARK.md` before touching branding.
