# Changelog

## 2026.0.319-MR1.0 — "Major Rewrite One" — 2026-03-19

### Added
- Monorepo structure with npm workspaces (`packages/server`, `packages/extension`)
- TypeScript for both server and extension with esbuild bundling
- SVG speed gauges with animated fill for download/upload
- Test history persisted to `chrome.storage.local` (last 20 results)
- Cancel button to abort tests mid-run
- Connection quality rating (Excellent / Good / Fair / Poor)
- Packet loss percentage reporting
- Segmented progress bar (Ping → Download → Upload)
- Offline detection with automatic UI updates
- Badge indicator showing last download speed on extension icon
- Server rate limiting (ping: 60/min, download/upload: 10/min)
- CORS restricted to known origins and browser extensions
- Input validation on all server endpoints (path traversal protection, content-type checks)
- Health check endpoint (`GET /health`)
- Variable download test sizes (1, 5, 10, 25 MB)
- Vitest + supertest server test suite (8 tests)
- GitHub Actions CI pipeline (lint, type-check, build, test)
- Content Security Policy in extension manifest
- Accessibility improvements (aria-live, aria-label, keyboard navigation)

### Changed
- Migrated from vanilla JavaScript to TypeScript
- Restructured from flat layout to npm workspace monorepo
- Upgraded manifest to v1.0.0 for store publishing
- Reduced upload body limit from 200MB to 10MB
- Consistent error handling (all test functions throw on failure)
- Re-enabled ESLint rules (no-unused-vars, no-undef) with proper environment separation
- Cleaned up root package.json (removed 100+ transitive dependencies listed as direct)

### Removed
- Duplicate extension files from server directory
- Informal emoji-heavy server responses (kept minimal)

## 0.2.0 - Initial Development

- Basic speed test extension with download, upload, ping, jitter
- Express.js server with test file generation
- Glassmorphism popup UI
