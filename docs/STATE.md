# MeterX working state

Last updated: 2026-10-22, on `main` at `e5e7b9c`.

Update this file at the end of each work session. Keep it short. Delete entries once they are done and merged.

## In progress

Nothing is mid-change. The last feature release was the APR work (commit `d8bebb9`: multi-stream measurement, side panel, scheduled tests, notifications, JSON/CSV export, share links, ISP comparison, tooltips, bufferbloat). It has no CHANGELOG entry yet (#91).

Next session, in this order:

1. Measurement correctness: #60 (slow-upload reads 0 Mbps), #64 (Mbps units), #63 (cancel), #65 (retry loop). These change every result users see, so ship them together and add #87 tests first.
2. History: #61 (save from the service worker) and #62 (don't save failures). One change.
3. Backend abuse risk: #79 (worker rate limit, free plan only), #80 (CORS `null`).
4. Scheduling: #66 (alarm reset on restart), #67 (notify spam).
5. Docs and release hygiene: #89 (one version), #91 (CHANGELOG), #92 (privacy policy, before any store update).

Open question for the owner: where the share viewer should live (#74). `meterx.dev` does not resolve; the only owned domain is `ajithakdev.com`.

## Last session

- 2026-10-22: Added `CLAUDE.md`, `docs/` (this file, CODEMAP, KNOWN-ISSUES) and a graphify graph (`graphify-out/`). Repo scan by parallel agents filed #60 to #93. Closed #23 (dup of #18) and #41 (dup of #19). Commented on #10, #22 and #55. Added the `security` label.

## Open pull requests

None (checked 2026-10-22). Refresh with `gh pr list` and `gh issue list`. Issues #4 to #56 are feature ideas; #60 to #93 are bugs, tests and docs from the scan.

## Known issues

See `docs/KNOWN-ISSUES.md`.
