# Contributing to MeterX

Here's how to get set up and contribute.

## Dev Setup

```bash
git clone https://github.com/ajithakdev/meterx-server.git
cd meterx-server
npm install
npm run build
```

## Load the Extension

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/dist/`

Rebuild with `npm run build` after changes, then hit reload on the extensions page.

## Run the Worker Locally

```bash
cd packages/worker
npx wrangler dev
```

This starts a local Cloudflare Worker on `http://localhost:8787`. Update the server URL in the extension settings to point here.

## Run the Server Locally

```bash
npm start
```

Starts the Express.js self-host server. Useful for LAN testing or when you don't want to touch the worker.

## Project Structure

```text
packages/
  extension/    # Browser extension (TypeScript, Manifest V3, esbuild)
  worker/       # Cloudflare Worker — primary serverless backend
  server/       # Express.js server — self-host fallback
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install all workspace deps |
| `npm run build` | Build all packages |
| `npm start` | Run self-host server |
| `npm test` | Run all tests |
| `npm run lint` | ESLint check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm -w @meterx/server run test` | Run server tests only |
| `cd packages/worker && npx wrangler dev` | Run worker locally |
| `cd packages/worker && npx wrangler deploy` | Deploy worker to Cloudflare |

## Code Style

- TypeScript everywhere — no plain JS
- ESLint with strict rules, run `npm run lint` before committing
- Prefix unused parameters with `_`
- Keep functions short and focused
- Throw errors, don't return sentinel values
- No `any` unless absolutely necessary

## Pull Requests

1. Fork the repo, branch from `main`
2. Make your changes
3. Run `npm run lint && npm run build && npm test` — all must pass
4. Open a PR with a clear description of what changed and why
5. One approval required to merge

## Reporting Bugs

Open an issue with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors if applicable
