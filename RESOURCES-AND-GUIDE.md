# MeterX: resources and guide

Every link for MeterX, what it is for, and how to run, package and release it. Passwords and keys are never written here.

## TL;DR

- Website: https://meterx.ajithakdev.com (one link for any browser: https://meterx.ajithakdev.com/get/)
- Code: https://github.com/ajithakdev/meterx (was `meterx-server`; GitHub redirects the old URL)
- `npm run build`, `npm test`, `npm run lint` from the root; `npm run package` writes the store uploads to `release/`.
- Releases are weekly on Sunday: tag, GitHub release, `wrangler deploy` for the worker, store uploads, site deploy.
- Default test server: https://meterx-speedtest.meterx-ajithakdev.workers.dev

## Links and what each one is for

### Public

| Link | Use it for |
| --- | --- |
| https://meterx.ajithakdev.com | Product site: home, how it works, features, questions, about |
| https://meterx.ajithakdev.com/get/ | Sends each visitor to their own browser's store. Use this link in posts and bios |
| https://meterx.ajithakdev.com/contribute/ | Contribute: live issues for newcomers and contributors from GitHub |
| https://meterx.ajithakdev.com/privacy/ | Privacy policy (the stores link here) |
| https://meterx.ajithakdev.com/r/ | Share viewer: opens links made by the Share button |
| https://addons.mozilla.org/firefox/addon/meterx-by-ajithakdev/ | Firefox listing (add-on id `meterx@ajithakdev`) |
| https://microsoftedge.microsoft.com/addons/detail/glkpolbkpachomgmmhdkmjnghejbhlfc | Microsoft Edge listing |
| Opera Add-ons | Listing link not found yet; add it to `apps/site/src/stores.ts` when known |
| https://meterx-speedtest.meterx-ajithakdev.workers.dev | Default test server (Cloudflare Worker) |

### Behind the scenes

| Link | Use it for |
| --- | --- |
| https://github.com/ajithakdev/meterx | Source code, issues, pull requests, releases |
| https://github.com/ajithakdev/meterx/actions | CI runs |
| https://addons.mozilla.org/developers/ | Firefox uploads and review |
| https://partner.microsoft.com/dashboard/microsoftedge/ | Edge uploads |
| https://addons.opera.com/developer/ | Opera uploads |
| https://dash.cloudflare.com | Worker, Pages project `meterx-site`, DNS for `ajithakdev.com` |

## Accounts

| Service | Account | Role |
| --- | --- | --- |
| GitHub | `ajithakdev` | Owner |
| Cloudflare | personal account (`meterx-ajithakdev` workers subdomain) | Worker, Pages, DNS; free plan only |
| Firefox, Edge, Opera developer accounts | Ajith Kumar K | Store listings |

## User guide

1. Install MeterX from your browser's store (https://meterx.ajithakdev.com/get/).
2. Click the MeterX icon in the toolbar and press Run test. It takes about twenty seconds.
3. Open the side panel (the panel icon in the popup) to see your history, trend and plan comparison.
4. In settings (the sliders icon), enter your ISP plan, choose a test schedule, or point MeterX at your own server.
5. Export or Share from the popup or side panel to save a PDF, CSV or JSON, or send someone a link.

## Admin guide

| Job | How |
| --- | --- |
| Install | `npm install` |
| Build everything | `npm run build` (the site build needs the extension build, which runs first) |
| Test, lint, type check | `npm test`, `npm run lint`, `npx tsc --noEmit` in a package |
| Load the extension | `chrome://extensions`, Developer mode, Load unpacked: `apps/extension/dist/` |
| Preview the site | `npm run dev:site` (builds, serves on http://localhost:8788) |
| Test the extension | `npm run dev:ext` (builds, runs the worker on http://localhost:8787; load `apps/extension/dist` with Load unpacked) |
| Package for the stores | `npm run package`: `release/meterx-<version>-chromium.zip` (Chrome, Edge, Opera), `-firefox.zip`, `-source.zip` (upload with the Firefox build) |
| Deploy the worker | `cd services/worker && npx wrangler deploy` |
| Deploy the site | `npm run deploy -w @meterx/site`: builds the extension and site and uploads to Cloudflare Pages project `meterx-site`. Not connected to git, so merges (docs or code) never deploy |
| First site deploy (once) | `npx wrangler pages project create meterx-site --production-branch main`, then `npm run deploy -w @meterx/site`, then in the Cloudflare dashboard: Workers and Pages, `meterx-site`, Custom domains, add `meterx.ajithakdev.com` (Cloudflare adds the CNAME itself). Then set the GitHub repo's website to the site |
| Submit to the stores | `npm run package`, then upload `release/meterx-<version>-chromium.zip` to Edge and Opera, and `-firefox.zip` plus `-source.zip` to Firefox. Images are in `brand/png/store/`. All three stores are free; the Chrome Web Store needs a one-time paid developer fee, so it waits |
| Bump the version | Edit `version` in the root `package.json` only; the build stamps it everywhere |
| Release | Move CHANGELOG Unreleased under the version, commit `chore: release vX.Y.Z`, tag, push the tag, `gh release create`, then deploy the worker, deploy the site and upload the store zips. Merging to `main` deploys nothing |
| Regenerate brand images | `npm run build`, then `node brand/build.mjs` (see the header of that file for the env vars) |
| Regenerate the code map | `node scripts/codemap.mjs` |
| Logo history | `brand/alternates/` keeps the other logo options that were considered (rising bars, up and down arrows) |

## When something goes wrong

| Problem | Fix |
| --- | --- |
| Site quick test or settings check says it cannot reach the server | The worker must allow the site origin: deploy it with `wrangler deploy` |
| Custom server URL rejected | Use https for remote servers. Plain http is only allowed for localhost, 127.0.0.1 and .local |
| Server returns 429 Too Many Requests | Wait a minute for the rate limit window to reset |
| Firefox upload rejected for a missing id | Upload the `-firefox.zip` from `npm run package`, not the Chromium zip |
| Site build fails with "Build the extension first" | Run `npm run build` from the root, or build `@meterx/extension` before `@meterx/site` |
| The demo pages on the site look out of date | Rebuild: the site copies the current extension build into `/app/` |

## More detail

- docs/STATE.md: what is in progress and what comes next
- docs/CODEMAP.md: every source file, with the message protocol
- docs/SITE-PLAN.md: the site's pages, hosting and brand assets
- docs/KNOWN-ISSUES.md: open bugs by area
- docs/SEO.md: the site's SEO setup and release checklist
- CHANGELOG.md, CONTRIBUTING.md, TRADEMARK.md, LICENSE
