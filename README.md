# MeterX

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ajithakdev/meterx-server/actions/workflows/ci.yml/badge.svg)](https://github.com/ajithakdev/meterx-server/actions)

Open-source internet speed test browser extension. Measure download, upload, ping, jitter, and packet loss — right from your toolbar.

<!-- TODO: Add Chrome Web Store and Edge Add-ons badges once published -->

## Features

- **Speed gauges** — animated SVG arcs for download & upload
- **Ping, jitter, packet loss** — full network health picture
- **Connection quality rating** — Excellent / Good / Fair / Poor
- **Test history** — last 20 results stored locally
- **Cancel mid-test** — abort anytime
- **Offline detection** — auto-disables when disconnected
- **Badge indicator** — last download speed on the extension icon
- **Self-hostable server** — bring your own backend
- **No tracking, no accounts** — fully local, fully private

## Install

### From Store (coming soon)

Chrome Web Store and Edge Add-ons listings are in progress.

### From Source

```bash
git clone https://github.com/ajithakdev/meterx-server.git
cd meterx-server
npm install
npm run build
```

**Load the extension:**
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/dist/`

**Run the server locally (optional):**
```bash
npm run dev:server
```
Then update the server URL in `packages/extension/src/background.ts`.

## Architecture

```text
packages/
  server/           # Express.js speed test server (TypeScript)
    src/app.ts          # Express app (routes, middleware)
    src/server.ts       # Entry point
    src/app.test.ts     # Vitest tests
  extension/        # Browser extension (TypeScript, Manifest V3)
    src/background.ts   # Service worker — test orchestration
    src/popup.ts        # Popup UI logic
    static/             # HTML, CSS, manifest, icons
    build.mjs           # esbuild bundler
```

### Server Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ping` | GET/HEAD | Latency measurement |
| `/test-file/:size` | GET | Download test (1, 5, 10, 25 MB) |
| `/upload` | POST | Upload test |
| `/health` | GET | Server health check |

All endpoints are rate-limited. CORS is restricted to browser extensions and configured origins.

## Development

```bash
npm install          # Install all workspace deps
npm run build        # Build server + extension
npm run lint         # ESLint check
npm -w @meterx/server run test   # Run server tests
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guide.

## Tech Stack

- **Extension:** TypeScript, Manifest V3, esbuild
- **Server:** TypeScript, Express.js 5, esbuild
- **Testing:** Vitest, supertest
- **CI:** GitHub Actions

## Privacy

MeterX collects zero personal data. Speed test results are stored locally in your browser only. Network requests are made only to the configured test server. See [privacy-policy.md](privacy-policy.md).

## License

[MIT](LICENSE) — Created by [ajithakdev](https://github.com/ajithakdev)
