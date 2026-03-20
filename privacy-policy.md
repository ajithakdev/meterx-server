# Privacy Policy for MeterX

**Last Updated:** March 20, 2026

This privacy policy explains how MeterX, created by [ajithakdev](https://github.com/ajithakdev), handles your information when you use the MeterX browser extension and its speed test infrastructure.

## 1. What We Collect

### Extension (runs in your browser)

- **Speed test results** — download, upload, ping, jitter, packet loss. Displayed in the popup and stored locally in your browser via `chrome.storage.local`. This data never leaves your device unless you export a report.
- **Test history** — up to 200 past results stored locally. Visible only to you.
- **Server URL preference** — if you configure a custom server, that URL is saved in `chrome.storage.sync`.

### Server interaction (during a speed test)

When you run a test, the extension connects to a Cloudflare Worker (`meterx-speedtest.meterx-ajithakdev.workers.dev`) or your configured custom server. During this connection:

- **Your IP address** is sent to the server as part of normal HTTPS communication. Cloudflare Workers do not log request IPs by default.
- **Download test** — the server streams binary data to your browser. No data about you is collected.
- **Upload test** — your browser sends binary data to the server. The server discards this data immediately after receiving it. Nothing is stored.
- **Ping test** — minimal HEAD requests for latency measurement. No payload.
- **No cookies, no tracking, no analytics.** The server is stateless.

## 2. How We Use Your Information

- **To run the speed test** — that's it. The server exists solely to send/receive test data.
- **To show you results** — stored locally in your browser, never transmitted elsewhere.
- **PDF reports** — generated entirely in your browser using html2canvas. No server involved.

## 3. Data Sharing

- **We do not sell your data.** Ever.
- **Cloudflare** — the default speed test server runs on Cloudflare Workers. Cloudflare's infrastructure processes the HTTPS requests. See [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/) for their data handling practices.
- **Self-hosted servers** — if you configure a custom server URL, your test data goes to that server instead. MeterX has no visibility into third-party servers.
- **Legal** — we may disclose information if required by law.

## 4. Data Retention

- **Local data** — stays on your device until you clear browser storage or uninstall the extension.
- **Server-side** — the Cloudflare Worker stores nothing. It processes requests and discards all data immediately. There are no databases, no logs, no files.

## 5. Security

All communication between the extension and the server uses HTTPS. The extension requests only the minimum permissions needed (`storage` for saving results, host permission for the speed test server).

## 6. Your Choices

- Run a test or don't — it's always your choice.
- Clear your history anytime from browser storage.
- Use a self-hosted server if you don't want to connect to the default Cloudflare endpoint.
- Export your data as a PDF report that you control.

## 7. Children's Privacy

MeterX is not designed for children under 13. We do not knowingly collect information from children.

## 8. Changes

If this policy changes, the "Last Updated" date at the top will reflect it.

## 9. Contact

- **Author:** Ajith Kumar K ([@ajithakdev](https://github.com/ajithakdev))
- **Email:** ajithkumarks2579@gmail.com
- **GitHub:** [github.com/ajithakdev/meterx-server/issues](https://github.com/ajithakdev/meterx-server/issues)
