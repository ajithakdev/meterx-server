# Changelog

All notable changes to MeterX are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/), with the year as the major number so store versions keep increasing.

## [Unreleased]

### Changed
- CHANGELOG moved to Keep a Changelog format and past releases tagged as `v2026.0.0`, `v2026.1.0` and `v2026.2.0` (#91)

## [2026.2.0] - 2026-04-23

Released on GitHub only. It never went to a store; stores stay on 2026.3.20.1 until 2027.0.0.

### Added
- Multi-stream measurement: 4 parallel download and 3 upload streams over a fixed window, with ramp-up and tail trimmed
- Loaded-latency pings during download and a bufferbloat grade (A to F)
- DNS lookup time from the Resource Timing API, and IPv4 or IPv6 detection through a new `/ip` endpoint
- Side panel dashboard with a trend chart, ISP comparison and history
- Scheduled background tests (30 minutes, 2 hours or daily) with an optional notification when quality drops to Poor
- ISP plan comparison against advertised download and upload speeds
- Share links, JSON and CSV export, a download sparkline in the popup, and plain-language tooltips
- `@meterx/shared` package for types and thresholds shared by the extension, worker and server

### Changed
- `popup.ts` split into focused modules (quality, history, format, exports, share, chart)
- Optional host permissions narrowed to `https://*/*` plus localhost addresses
- Server rate limits raised for the multi-stream burst (ping 240/min, transfers 120/min)

### Fixed
- Download time on the non-streaming fallback path was always about 1 second
- The test could hang on "Testing..." after the download finished
- Export menu, ISP inputs and options layout overflowing at high zoom

## [2026.1.0] - 2026-03-20

Shipped to Firefox Add-ons, Edge Add-ons and Opera as store version 2026.3.20.1 ("Edge Migration").

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

## [2026.0.0] - 2026-03-19

First store release, store version 2026.3.19.1 ("Major Rewrite One").

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

## [0.2.0] - 2025-05-10

### Added

- Basic speed test extension with download, upload, ping, jitter
- Express.js server with test file generation
- Simple popup UI

[Unreleased]: https://github.com/ajithakdev/meterx-server/compare/v2026.2.0...HEAD
[2026.2.0]: https://github.com/ajithakdev/meterx-server/compare/v2026.1.0...v2026.2.0
[2026.1.0]: https://github.com/ajithakdev/meterx-server/compare/v2026.0.0...v2026.1.0
[2026.0.0]: https://github.com/ajithakdev/meterx-server/compare/v0.2.0...v2026.0.0
[0.2.0]: https://github.com/ajithakdev/meterx-server/releases/tag/v0.2.0
