# MeterX working state

Last updated: 2026-10-24, on `release/v2027.0.0` at `b4e5b7c` (not pushed, no PR yet).

Update this file at the end of each work session. Keep it short. Delete entries once they are done and merged.

## In progress

Major release 2027.0.0 on branch `release/v2027.0.0`: one branch, one PR, merged only on the owner's word. The owner tests locally before the PR is opened.

Done on the branch:
- Re-architecture: `extension/src/{background,lib,pages}`, version and API contract in `@meterx/shared`.
- Redesign of popup, side panel and settings (`static/styles/`). Settings checked for layout shift at 1280 and 390 px.
- Code comments cite fixes for #60, #64-#70, #73, #76-#79, #81, #82, #85. Verify each against its issue before closing it.

Next, in order:
1. Owner tests `packages/extension/dist/` unpacked in Chrome.
2. Check the remaining bugs from the scan: #61, #62 (history), #63 (cancel), #80 (CORS null), #87 (tests).
3. Firefox-compatible build (`lib/browser.ts` is the start).
4. Site at `meterx.ajithakdev.com` with the share viewer (#74): plan in `docs/SITE-PLAN.md`.
5. Privacy policy (#92), open the PR. The version is already 2027.0.0 in the root `package.json`.

Logo: five options were shown on 2026-10-24; waiting for the owner's pick. Then icons, store banners and the site, in the order in `docs/SITE-PLAN.md`.

## Releases

Weekly on Sunday, like toolglass (decided 2026-10-24): patch for fixes only, minor if a feature landed; same-day patch for a broken test or security issue. Nothing deploys on merge here anyway: the worker deploys by hand with `wrangler deploy` and the stores take manual uploads, so a release is the tag, the CHANGELOG section, the GitHub release, then the worker deploy and store uploads.

## Open pull requests

None. Refresh with `gh pr list` and `gh issue list`.

## Known issues

See `docs/KNOWN-ISSUES.md`.
