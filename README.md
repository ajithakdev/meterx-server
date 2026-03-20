# MeterX

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/ajithakdev/meterx-server/actions/workflows/ci.yml/badge.svg)](https://github.com/ajithakdev/meterx-server/actions)

Open-source speed test browser extension. Measures download, upload, ping, jitter, and packet loss from your toolbar — powered by Cloudflare's edge network.

## Features

- **Full speed test** — download, upload, ping, jitter, packet loss
- **Use-case readiness** — labels for Calls, Streaming, Gaming, Uploads
- **Connection quality badge** — live rating on the extension icon
- **PDF health report** — export a full network report as PDF
- **Test history** — last 7 displayed, 200 stored locally
- **Cloudflare edge** — serverless backend at 300+ PoPs worldwide
- **Self-hostable server** — Express.js fallback for LAN or self-hosting
- **Settings page** — configure custom server URL
- **Animated UI** — progress steps, speed bars, smooth transitions
- **No tracking, no accounts** — everything stays in your browser

## Install from Source

```bash
git clone https://github.com/ajithakdev/meterx-server.git
cd meterx-server
npm install
npm run build
```

**Load the extension:**
1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked" and select `packages/extension/dist/`

**Run the server locally (optional):**
```bash
npm start
```

## Architecture

```text
meterx-server/
  packages/
    extension/        # Browser extension (TypeScript, Manifest V3, esbuild)
      src/
        background.ts     # Service worker — test orchestration
        popup.ts          # Popup UI, history, PDF export
      static/             # HTML, CSS, manifest, icons
      build.mjs           # esbuild bundler

    worker/           # Cloudflare Worker — primary backend (serverless)
      src/index.ts        # Edge handler — download, upload, ping, health
      wrangler.toml       # Wrangler config

    server/           # Express.js server — self-host fallback
      src/
        app.ts            # Express app (routes, middleware)
        server.ts         # Entry point
        app.test.ts       # Vitest + supertest (8 tests)
```

```text
Browser Extension  -->  Cloudflare Worker (default, 300+ PoPs)
                   -->  Express Server    (self-host / LAN fallback)
```

## Server Endpoints

Both the worker and self-host server expose the same API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ping` | GET/HEAD | Latency measurement |
| `/test-file/:size` | GET | Download test (1, 5, 10, 25 MB) |
| `/upload` | POST | Upload drain |
| `/health` | GET | Health check (includes edge location on worker) |

All endpoints are rate-limited. CORS restricted to browser extensions and configured origins.

## Development

```bash
npm install                              # Install all workspace deps
npm run build                            # Build all packages
npm start                                # Run self-host server
npm test                                 # Run all tests
cd packages/worker && npx wrangler dev   # Run worker locally
npm run lint                             # ESLint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Tech Stack

- **Extension:** TypeScript, Manifest V3, esbuild
- **Worker:** Cloudflare Workers, TypeScript, Wrangler
- **Server:** TypeScript, Express.js 5, esbuild
- **Testing:** Vitest, supertest
- **CI:** GitHub Actions

## Privacy

MeterX collects zero personal data. All results are stored locally in your browser. Network requests go only to the configured test server. See [privacy-policy.md](privacy-policy.md).

## License

[AGPL-3.0](LICENSE)

Created by [ajithakdev](https://github.com/ajithakdev)
