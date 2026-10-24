# MeterX

Links, accounts and how-tos: [RESOURCES-AND-GUIDE.md](RESOURCES-AND-GUIDE.md)

MeterX is a free, open-source browser extension that tests your internet from the toolbar: download, upload, ping, jitter, packet loss and latency under load (bufferbloat). Results stay in your browser.

Website: [meterx.ajithakdev.com](https://meterx.ajithakdev.com)

## Install

- Firefox: [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/meterx-by-ajithakdev/)
- Microsoft Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/glkpolbkpachomgmmhdkmjnghejbhlfc)
- Opera and Chrome: coming soon

## What it does

- A full test in about twenty seconds, with several parallel streams and the slow start trimmed.
- Latency under load, graded from A to F, so you can see why calls stutter while something downloads.
- A plain answer about what the connection is good enough for: calls, 4K streaming, gaming, uploads.
- History of up to 200 results in the side panel, with a trend chart and a comparison with your ISP plan.
- Scheduled tests with a notice when quality drops.
- PDF reports, and CSV and JSON exports with units in every column.
- Share links that carry the result inside the link, never through a server.
- Tests against the nearest Cloudflare location, or against your own server.

## Repository layout

```text
apps/extension     Manifest V3 extension (popup, side panel, settings, service worker)
apps/site          meterx.ajithakdev.com, which runs the extension's own pages in demo mode
services/worker    Cloudflare Worker, the default test server (stores nothing)
services/server    Express server with the same API, for self-hosting
packages/shared    types, API constants, version, quality rules, formatting, share links
packages/reports   PDF, CSV and JSON builders
brand/             logo and the script that makes every icon and store image
scripts/           store packaging and the code map generator
```

More detail in [CLAUDE.md](CLAUDE.md) and [docs/CODEMAP.md](docs/CODEMAP.md).

## Development

```bash
git clone https://github.com/ajithakdev/meterx.git
cd meterx
npm install
npm run build      # extension, site and server
npm test
npm run lint
npm run package    # store uploads in release/
```

Load the extension unpacked from `apps/extension/dist/`. Preview the site with `npx wrangler pages dev apps/site/dist`. Run the self-host server with `npm start` (port 3000).

## Privacy

MeterX collects no personal data. Results are stored in your browser, and the default test server keeps no logs. The full policy is at [meterx.ajithakdev.com/privacy](https://meterx.ajithakdev.com/privacy/).

## License

[AGPL-3.0](LICENSE). See [TRADEMARK.md](TRADEMARK.md) for the name and logo.

Made by Ajith Kumar K ([@ajithakdev](https://github.com/ajithakdev)).
