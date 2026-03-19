# Contributing to MeterX

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/ajithakdev/meterx-server.git
   cd meterx-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build everything**
   ```bash
   npm run build
   ```

4. **Run the server locally**
   ```bash
   npm run dev:server
   ```

5. **Load the extension in Chrome/Edge**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/dist/`

## Project Structure

```text
packages/
  server/       # Express.js speed test server (TypeScript)
    src/
      app.ts        # Express app (exported for testing)
      server.ts     # Entry point (starts listening)
      app.test.ts   # Vitest tests
  extension/    # Browser extension (TypeScript, Manifest V3)
    src/
      background.ts # Service worker — test orchestration
      popup.ts      # Popup UI logic
    static/
      popup.html    # Popup markup
      popup.css     # Styles
      manifest.json # Extension manifest
    build.mjs       # esbuild script
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages |
| `npm run build:server` | Build server only |
| `npm run build:extension` | Build extension only |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm -w @meterx/server run test` | Run server tests |
| `npm run dev:server` | Start server locally |

## Code Style

- TypeScript for all source code
- ESLint with strict rules enabled
- Use `_` prefix for intentionally unused parameters
- Keep functions small and focused
- Prefer throwing errors over returning sentinel values

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run build` — both must pass
4. Run `npm -w @meterx/server run test` — tests must pass
5. Open a PR with a clear description of what and why

## Reporting Bugs

Open an issue with:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
