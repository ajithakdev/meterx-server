# MeterX: resources and guide

Every link for the speed test extension and server, what it is for, and how to run and release it. Passwords and keys are never written here.

## TL;DR

- The repo contains the browser extension, Cloudflare Worker backend, and Express fallback server.
- Cloudflare Worker at https://meterx-speedtest.meterx-ajithakdev.workers.dev serves as the default edge backend.
- Run `npm run build` to compile all packages, and `npm test` to run tests.
- Pushes to `main` build the extension and package `meterx-extension.zip` in GitHub Actions CI.
- The extension options page allows switching to a local Express server at http://localhost:3000.

## Links and what each one is for

### Public

| Link | Use it for |
| --- | --- |
| https://meterx-speedtest.meterx-ajithakdev.workers.dev | Default Cloudflare Worker speed test edge backend |
| https://meterx.dev/share | Shared speed test results viewer |
| https://github.com/ajithakdev | Author GitHub profile |

### Behind the scenes

| Link | Use it for |
| --- | --- |
| https://github.com/ajithakdev/meterx-server | Source code, issues, and pull requests |
| https://github.com/ajithakdev/meterx-server/actions | GitHub Actions CI workflow runs |
| https://github.com/ajithakdev/meterx-server/issues | Bug reports and issue tracker |

## Accounts

| Service | Account | Role |
| --- | --- | --- |
| GitHub | `ajithakdev` | Owner |
| Cloudflare | `meterx-ajithakdev` | Worker backend host |

## User guide

Click the MeterX icon in the browser toolbar to open the popup. Select Start Test to measure download speed, upload speed, ping, jitter, and packet loss. Results are saved locally in browser storage.

To point the extension at a self-hosted server, click the settings gear icon in the popup. Select Custom Server under Server. Enter the server URL, such as http://localhost:3000, and click Test to verify the connection. Click Save. Plain http is permitted for localhost, 127.0.0.1, and .local domains.

## Run and release

| Job | How |
| --- | --- |
| Install dependencies | `npm install` |
| Build all packages | `npm run build` |
| Run Express server | `npm start` |
| Run Worker locally | `cd packages/worker && npx wrangler dev` |
| Run tests | `npm test` |
| Lint codebase | `npm run lint` |
| Load unpacked extension | Open `chrome://extensions`, enable Developer mode, and load `packages/extension/dist/` |
| Package extension zip | `cd packages/extension/dist && zip -r ../../../meterx-extension.zip .` |
| Deploy Worker | `cd packages/worker && npx wrangler deploy` |

## When something goes wrong

| Problem | Fix |
| --- | --- |
| Express rate limit error behind reverse proxy | Set `app.set('trust proxy', 1)` in Express to read client IPs through proxy headers |
| Custom server URL rejected | Use https for remote servers. Plain http is only allowed for localhost, 127.0.0.1, or .local domains |
| Bufferbloat inflates ping after upload | A buffer drain delay separates the upload test and ping test in the background worker |
| Blank PDF report export | Render the container offscreen with visible styling instead of using opacity zero |
| Server returns 429 Too Many Requests | Wait one minute for the rate limit window to reset |

## More detail

- docs/STATE.md: What is in progress and what comes next.
- docs/KNOWN-ISSUES.md: Open bugs by area, each linked to its GitHub issue.
- docs/CODEMAP.md: File map with line counts and the extension's message protocol.
- README.md: Architecture overview, feature list, and server endpoint details.
- CONTRIBUTING.md: Development setup, commands, code style, and pull request guidelines.
- CHANGELOG.md: Version history and migration notes.
- privacy-policy.md: Extension and server data handling policy.
- TRADEMARK.md: Brand usage rules for the MeterX name and logo.
- LICENSE: AGPL-3.0 terms for the codebase.
