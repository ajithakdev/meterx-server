# MeterX known issues

Found on 2026-10-22 at commit `e5e7b9c` by a read-only scan (four parallel agents, main claims spot-checked by hand). Nothing was run in a browser. Each row has a GitHub issue with the evidence and a suggested fix.

Remove a row when its fix is merged.

## Measurement and history

| Issue | Severity | Summary |
|---|---|---|
| #60 | High | Upload reads 0 Mbps below about 12.6 Mbps (bytes credited only per finished 5 MB request) |
| #61 | High | Tests run with the popup closed are never saved |
| #62 | Med | Failed and cancelled tests are saved as history |
| #63 | Med | Cancel doesn't stop in-flight transfers or the ping phase |
| #64 | Med | Speeds use mebibits but are labelled Mbps (about 4.6% low) |
| #65 | Med | Failed requests retry in a tight loop and show as 0 Mbps |
| #66 | Med | Schedule alarm resets on every browser start |
| #67 | Low | Notify-on-drop fires on every poor result; quality rules in three copies |
| #69 | Low | DNS time can come from an earlier test |
| #71 | Low | `edge` is never set on results |

## Extension UI

| Issue | Severity | Summary |
|---|---|---|
| #74 | Med | Share links point to `meterx.dev`, which doesn't resolve |
| #68 | Low | Trailing slash in a custom server URL breaks every endpoint |
| #72 | Low | Nothing in the UI opens the side panel |
| #73 | Med | Tooltip `aria-label` hides values from screen readers |
| #75 | Med | Popup and options page shift layout on state change |
| #70 | Low | ISP plan shows red "0% of paid" for a blank field |
| #76 | Low | PDF trend says "Declining (-100%)" for one test |
| #77 | Low | Start re-enables mid-test when the network comes back |
| #78 | Low | CSV export misses `\r` and formula injection |

## Backends

| Issue | Severity | Summary |
|---|---|---|
| #79 | High | Worker has no rate limit; one script can exhaust the free daily quota |
| #80 | Med | Worker allows `Origin: null`, sends an empty ACAO header |
| #81 | Med | Express answers a rejected CORS origin with a 500 |
| #82 | Med | Express sends no `Timing-Allow-Origin` on `/ping` and `/test-file` |
| #83 | Med | Express upload limit silently caps results near 600 Mbps |
| #84 | Med | `/health` shape differs between worker, Express and the shared type |
| #85 | Low | Express 500 on zero-padded sizes; uploads buffered in memory |

## Tests, CI, docs

| Issue | Summary |
|---|---|
| #86 | Worker and shared are not linted, type-checked or tested in CI |
| #87 | Measurement math in `background.ts` is untested |
| #88 | Export, PDF stats, charts and URL validation are untested |
| #89 | Version is hard-coded in many places and disagrees |
| #90 | README badge, test count, endpoint list and rate-limit claim are wrong |
| #91 | CHANGELOG isn't Keep a Changelog and lacks the APR release |
| #92 | Privacy policy contradicts the worker config and permissions |
| #93 | Dead `server/src/test.ts` and stale `.junie/guidelines.md` |
