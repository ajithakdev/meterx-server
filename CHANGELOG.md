# Changelog

## 2026.0.320-MR1.1 — "Edge Migration" — 2026-03-20

### Added
- Cloudflare Worker (`packages/worker/`) — serverless edge speed test server
  - Streaming download via ReadableStream (1/5/10/25 MB)
  - Upload endpoint (drains body, no storage)
  - Ping endpoint (HEAD/GET) for latency
  - Health endpoint with edge location from cf-ray header
  - CORS support for browser extensions
  - Deployed at 300+ edge locations globally, zero cold starts
- Use-case readiness labels — Calls, Streaming, Gaming, Uploads with color indicators
- PDF health report export (html2canvas + jsPDF)
  - Dark theme matching the extension UI
  - Quality assessment, trend analysis, anomaly detection
  - Use-case assessment with color-coded cards
  - Full test history table with pagination
  - Watermark, footer with version and license
- Settings page (`options.html`) for server configuration
  - Radio presets: Cloudflare Edge vs Custom Server
  - Auto-checks connection status with edge location display
  - Latency measurement to configured server
  - Runtime host permission request for custom URLs
- Configurable server URL via `chrome.storage.sync`
- Connection warm-up (HEAD /ping) before download and upload tests
- Streaming download with live speed updates during test
- Buffer drain delay between upload and ping (prevents bufferbloat)
- Close button (SVG icon, glass style) on popup and settings page
- Settings gear icon in popup header
- Heart icon next to author name in footer
- Animated number counting on hero speed display
- Progress step animation (DL -> UL -> Ping) with connecting line fills
- Last test result persisted and shown on popup reopen
- "Last test: Xm ago" timestamp display
- History quality dots (color-coded by test quality)

### Changed
- Default server: Render -> Cloudflare Worker edge network
- Download test size: 5 MB -> 10 MB for better TCP ramp-up accuracy
- History display: 20 -> 7 most recent (200 stored for 30-day reports)
- License: MIT -> AGPL-3.0
- Popup width reduced for cleaner toolbar integration
- Speed unit display: "MBPS" corrected to "Mbps"
- PDF export: jsPDF coordinate-based -> html2canvas + jsPDF image-based
- Privacy policy updated for Cloudflare Workers architecture

### Fixed
- Express trust proxy setting for Render rate-limit error
- Bufferbloat inflating ping/jitter measurements after upload test
- PDF table headers forced to uppercase via CSS text-transform
- Extension UI briefly shrinking during PDF generation
- Blank PDF pages when container used opacity:0

### Removed
- Render as default/primary server (kept as self-host option)
- jsPDF coordinate-based PDF generation (replaced with html2canvas approach)

---

## 2026.0.319-MR1.0 — "Major Rewrite One" — 2026-03-19

### Added
- Monorepo structure with npm workspaces (`packages/server`, `packages/extension`)
- TypeScript for both server and extension with esbuild bundling
- Compact UI with speed bars, quality badge, and glassmorphic dark theme
- Test history persisted to `chrome.storage.local` (last 200 results)
- Cancel button to abort tests mid-run
- Connection quality rating (Excellent / Good / Fair / Poor)
- Packet loss percentage reporting
- Segmented progress bar (Download -> Upload -> Ping)
- Offline detection with automatic UI updates
- Badge indicator showing last download speed on extension icon
- Server rate limiting (ping: 60/min, download/upload: 10/min)
- CORS restricted to known origins and browser extensions
- Input validation on all server endpoints
- Health check endpoint (`GET /health`)
- Variable download test sizes (1, 5, 10, 25 MB)
- Vitest + supertest server test suite (8 tests)
- GitHub Actions CI pipeline (lint, type-check, build, test)
- Content Security Policy in extension manifest
- Accessibility improvements (aria-live, aria-label, keyboard navigation)

### Changed
- Migrated from vanilla JavaScript to TypeScript
- Restructured from flat layout to npm workspace monorepo
- Reduced upload body limit from 200MB to 10MB

### Removed
- Duplicate extension files from server directory

---

## 0.2.0 — Initial Development

- Basic speed test extension with download, upload, ping, jitter
- Express.js server with test file generation
- Simple popup UI
