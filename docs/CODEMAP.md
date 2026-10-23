# MeterX code map

Mapped at commit `e5e7b9c` (2026-10-22).

Check for drift before trusting this file: `git diff --stat e5e7b9c..HEAD -- packages`

Numbers in parentheses are line counts. Use them to judge read cost.

## Architecture in one screen

```
popup.html / sidepanel.html / options.html      (extension pages)
  popup.ts, sidepanel.ts, options.ts
    chrome.runtime.sendMessage({action})  ──►  background.ts (service worker)
    ◄── testProgress / testComplete / testError        │
                                                       │ fetch
                    ┌──────────────────────────────────┴───────────┐
                    ▼                                              ▼
   packages/worker (Cloudflare Worker, default)     packages/server (Express, self-host)
   /ping /test-file/:n MB.bin /upload /health /ip   same routes, rate limited
```

- All measurement runs in the service worker. The pages only send messages and render.
- Default backend: `https://meterx-speedtest.meterx-ajithakdev.workers.dev`. It appears in `background.ts` (`DEFAULT_SERVER_URL`), `options.ts` (`DEFAULT_URL`) and `static/manifest.json` (`host_permissions`).
- `packages/shared` is types plus two constant tables, imported as raw TS and bundled into each package.
- Settings live in `chrome.storage.sync`: `serverUrl`, `ispPlan`, `scheduleMinutes`, `notifyOnDrop`. History lives in `chrome.storage.local` under `history`.

## Message protocol

| Message | Sent by | Handled in | Notes |
|---|---|---|---|
| `startTest` | popup, side panel | `background.ts:539` | Runs `runFullTest`, replies with final status. |
| `cancelTest` | popup | `background.ts:547` | Aborts `testAbortController`. |
| `getServerUrl` / `setServerUrl` | (unused by pages today) | `background.ts:554`, `:570` | Options page writes storage directly. |
| `rescheduleTests` | options | `background.ts:558` | Re-reads `scheduleMinutes`. |
| `openSidePanel` | nothing | `background.ts:562` | Unreachable, see #72. |
| `testProgress` / `testComplete` / `testError` | background | popup, side panel | Broadcast with `chrome.runtime.sendMessage`. |

## Files

### Root

| File | Notes |
|---|---|
| `package.json` | npm workspaces `packages/*`. Scripts: `build`, `test`, `lint`, `start` (Express from `packages/server/dist`). |
| `eslint.config.js` | Flat config for extension TS, build scripts, server TS, CSS and Markdown. Worker and shared are not covered (#86). |
| `.github/workflows/ci.yml` | One `check` job on Node 22: lint, `tsc` for server and extension, build, test, then zips `packages/extension/dist` on pushes to `main`. |
| `.github/dependabot.yml` | Grouped monthly updates. |
| `RESOURCES-AND-GUIDE.md` | Links, accounts, how-tos. |
| `CHANGELOG.md`, `README.md`, `CONTRIBUTING.md`, `privacy-policy.md`, `TRADEMARK.md` | Human docs. Several are out of date (#90, #91, #92). |
| `.junie/guidelines.md` | Stale, describes the pre-monorepo layout (#93). |

### packages/extension

| File | Exports / role | Notes |
|---|---|---|
| `build.mjs` (28) | esbuild script | Bundles `background`, `popup`, `options`, `sidepanel` as ESM for `chrome110`, then copies `static/` into `dist/`. |
| `src/background.ts` (581) | service worker | Constants at the top (streams, durations, trims). `measureDownloadSpeed` (196), `measureUploadSpeed` (268), `measurePingAndJitter` (341), `runFullTest` (400), `startLoadedPingProbe` (103) for bufferbloat, `extractDnsMs` (153), alarms and notifications (482-527), message router (537). |
| `src/popup.ts` (402) | popup page | Hero gauge, step progress, stat bars, history list, export menu, share button. Saves history on `testComplete` (#61). |
| `src/options.ts` (261) | options page | Server preset vs custom URL, host-permission request, connection test via `/health`, ISP plan, schedule and notify settings. |
| `src/sidepanel.ts` (78) | side panel page | Last result, chart, history, ISP %, Start button. |
| `src/history.ts` (49) | `MAX_HISTORY` (200), `HISTORY_DISPLAY` (7), `saveHistory`, `loadHistory`, `loadAllHistory`, `renderHistory` | `chrome.storage.local` key `history`, newest first. |
| `src/quality.ts` (49) | `getQuality`, `getQualityClass`, `scoreUseCases`, `QualityLabel` | Has tests. `background.ts` keeps its own copy of the grading (#67). |
| `src/isp.ts` (64) | `loadIspPlan`, `saveIspPlan`, `renderIspComparison` | `chrome.storage.sync` key `ispPlan`. |
| `src/share.ts` (61) | `buildShareUrl`, `parseShareUrl` | Encodes a result into the URL fragment of `https://meterx.dev/share`, which does not exist yet (#74). Has tests. |
| `src/lib/export-pdf.ts` | `exportPdfReport`, `buildReport` | Vector PDF drawn with jsPDF in the app's light design: summary, load, readiness, plan, trend chart, paginated results. |
| `src/lib/export-data.ts` | `exportJson`, `exportCsv`, `COLUMNS` | One column list (units in the names) feeds CSV and JSON; JSON adds a versioned `format` and a summary. |
| `src/lib/report-stats.ts` | `summarize`, `consistency`, `trendPercent` | Pure stats shared by the PDF and JSON. |
| `src/chart.ts` (72), `src/sparkline.ts` (59) | `renderChart`, `renderSparkline` | Inline SVG strings. |
| `src/tooltips.ts` (67) | `TOOLTIP_COPY`, `bindTooltips` | Binds `[data-tip]` elements. |
| `src/format.ts` (19) | `fmt`, `getTimeAgo` | Has tests. |
| `static/manifest.json` | MV3 manifest | Permissions: storage, alarms, notifications, sidePanel. Custom servers use `optional_host_permissions`. Version is its own Chrome-style string. |
| `static/*.html`, `static/*.css` | Pages and styles | `popup.css` (556) is the largest. |
| `vitest.config.mjs` | Tests in `src/**/*.test.ts` | |

### packages/worker

| File | Notes |
|---|---|
| `src/index.ts` (220) | Default-export `fetch`. `corsHeaders` (19), `getEdgeLocation` from `cf.colo` (41), `streamBinaryData` 64 KB chunks (50), handlers for download (72), upload (91, drains body), ping (119), ip (137), health (158). No rate limit (#79). |
| `wrangler.toml` | Name `meterx-speedtest`, observability on. |

### packages/server

| File | Notes |
|---|---|
| `src/app.ts` (99) | Express 5 app: CORS (extension origins + `CORS_ORIGINS`), per-route rate limits, zero-filled test files in `test-files/` created on demand, `/ping`, `/test-file/:filename`, `/upload`, `/health`, `/ip`. |
| `src/server.ts` (7) | `app.listen(PORT || 3000)`. Built to `dist/server.js` by esbuild. |
| `src/app.test.ts` (76) | Vitest + supertest, 10 tests. |
| `src/test.ts` (88) | Legacy CommonJS smoke script, not run, broken (#93). |

### packages/shared

| File | Notes |
|---|---|
| `src/index.ts` (84) | `Quality`, `TestProgress`, `TestResults`, `PingResult`, `HealthResponse`, `HistoryEntry`, `IspPlan`, `QUALITY_THRESHOLDS`, `USE_CASE_REQUIREMENTS`. `HealthResponse` and `QUALITY_THRESHOLDS` are not used anywhere (#84, #67). |

## Tests

| Package | Files | Run one |
|---|---|---|
| extension | `format`, `quality`, `share` (21 tests) | `cd packages/extension && npx vitest run src/quality.test.ts` |
| server | `app.test.ts` (10 tests) | `cd packages/server && npx vitest run src/app.test.ts` |
| worker, shared | none | (#86) |
