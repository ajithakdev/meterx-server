# MeterX working state

Last updated: 2026-10-24, on `release/v2027.0.0`, PR open for review (see below).

Update this file at the end of each work session. Keep it short. Delete entries once they are done and merged.

## In progress (2026-10-24)

Major release 2027.0.0 on branch `release/v2027.0.0`, for Sunday 2026-10-25. The owner has tested the site and the extension locally and signed both off. The PR merges only on the owner's word.

Done on the branch:
- Repo renamed to `ajithakdev/meterx` and split into `apps/`, `services/` and `packages/`. `npm run package` makes the store zips; `npm run dev:ext` and `npm run dev:site` run local tests.
- Extension: redesign, live test view, exports (vector PDF with report ID, CSV, JSON), one version source, new X-on-a-dial logo (other options kept in `brand/alternates/`).
- Site (`apps/site`): Home, How it works, Features, Questions, Contribute, About, Privacy, Get MeterX, share viewer, 404. SEO tags, sitemap and robots are ready (`docs/SEO.md`).
- Cleanup: unused code, IDE files and a dev dependency removed; `privacy-policy.md` now points to the site.

Next, in order (Sunday):
1. Owner says merge; squash-merge the PR.
2. Release: CHANGELOG Unreleased to `## [2027.0.0] - 2026-10-25`, commit `chore: release v2027.0.0`, tag, `gh release create`.
3. `cd services/worker && npx wrangler deploy` (the site's quick test and settings check need the new worker).
4. Site, first time: create the Pages project, deploy, add the custom domain (steps in RESOURCES-AND-GUIDE.md, "First site deploy").
5. Store uploads from `release/` with images from `brand/png/store/`: Firefox, Edge, Opera (all free). Set each listing's website and privacy URL to the site. Chrome Web Store needs a paid developer fee, so it waits for the owner's call.
6. SEO one-time setup in `docs/SEO.md` (Search Console sitemap, Bing), GitHub repo website field, portfolio entry.
7. Opera listing link into `apps/site/src/stores.ts` once it is public.
8. Verify and close the scan's issues (#60, #64 to #70, #73, #76 to #79, #81, #82, #85); check #61 to #63, #80, #87.

## Releases

Weekly on Sunday, like toolglass (decided 2026-10-24): patch for fixes only, minor if a feature landed; same-day patch for a broken test or security issue. Nothing deploys on merge: the worker deploys with `wrangler deploy`, the site with `npm run deploy -w @meterx/site` (Pages direct upload, not git-connected), and the stores take manual uploads. So docs, CI and code merges are only merges; a release is the tag, the CHANGELOG section, the GitHub release, then the worker, site and store uploads.

## Open pull requests

None. Refresh with `gh pr list` and `gh issue list`.

## Known issues

See `docs/KNOWN-ISSUES.md`.
