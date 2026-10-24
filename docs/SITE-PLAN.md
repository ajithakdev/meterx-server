# MeterX site plan

Status: built on 2026-10-24 (multi-page, with the extension pages in demo mode). Not deployed yet. The plan below is kept for the reasoning; CLAUDE.md describes what exists.

## Goal

One site at `https://meterx.ajithakdev.com` that does four jobs:

1. Shows what MeterX is and gets the visitor to install it from the right store for their browser.
2. Hosts the share viewer the extension already links to (`SHARE_VIEWER = https://meterx.ajithakdev.com/r/`, #74).
3. Hosts the privacy policy the stores require (#92).
4. Gives one short link to promote everywhere (`/get`) that sends each visitor to their own browser's store.

It follows the pattern of `toolglass.ajithakdev.com` and `minnoli.ajithakdev.com`: its own subdomain, linked from the portfolio's projects list once it is live.

## Pages

| Route | What it is | Notes |
| --- | --- | --- |
| `/` | The product page (sections below) | Detects the browser and labels the main button "Add to Firefox", "Add to Edge" and so on |
| `/get` | Redirect to the visitor's store | Firefox, Edge and Opera go to their listings; Chrome and others land on `/#install` until the Chrome listing exists. One link for posts, bios and the README badge |
| `/r/#r=...` | Share viewer | Decodes with `parseShareUrl` from `@meterx/shared`, shows the result card (download, upload, ping, jitter, loss, grade, quality, time in the viewer's own locale) and an install button. The data stays in the hash, so it never reaches a server |
| `/about` | How MeterX measures, the story, open source | Multi-stream method, ramp-up and tail trimming, loaded latency, why results differ from other tests, AGPL, self-hosting |
| `/privacy` | Privacy policy for the stores | Rewritten from `privacy-policy.md` to match the real worker, permissions and storage (#92) |
| `/verify` | Later, with signed reports (#95) | Not in the first release |
| `404` | Short page with a link home | |

## Hosting and build

- **Hosting:** Cloudflare Pages on the free plan, project `meterx-site`, filled by direct upload (`npm run deploy -w @meterx/site`), not connected to git. DNS for `ajithakdev.com` is already on Cloudflare, so adding the custom domain in the Pages project creates the CNAME. It costs nothing and has no bandwidth charge.
- **Builds:** none on push or merge. Because the project is not git-connected, docs, CI or code merges never deploy anything; the site only changes when someone runs the deploy command.
- **Stack:** plain HTML and CSS with a little TypeScript bundled by esbuild, the same tool the extension uses. No framework. The site imports `@meterx/shared` for share links, quality rules and use-case thresholds, so the page and the extension can never disagree.
- **Releases:** the site deploys by hand with each Sunday release, after the worker. An urgent page fix can be deployed the same day.
- **SEO:** `docs/SEO.md` (required for every site repo): titles and descriptions per route, Open Graph card, sitemap, robots, canonical URLs, Search Console and Bing Webmaster Tools set-up, and a release checklist.

## Art direction

Dealt with the taste skill (`.taste-skill/direction.json`, seed 1632087775): **the sentence is the layout**, with the app's palette and typeface kept.

The idea: **the visitor's own speed becomes the word in the sentence.** A speed test produces one number, so the headline is a sentence with a live frame where that number goes. No other speed test can use this, because the frame runs a real MeterX test against the MeterX worker.

- **Type:** Geist only, the app's face. Display at medium weight, tracking -0.03em, leading 0.95.
- **Colour:** the app's light tokens (ground `#f2f4f7`, surface white, ink `#0a0a0a`, muted `#5b6068`) and dark tokens under `prefers-color-scheme`. The download blue `#1d5fbf` is used once per screen: on the main button, or on the live number.
- **Pictures:** real interface fragments built in HTML from the extension's own CSS (popup, side panel, settings, a PDF page), cropped like photographs. No device frames, no grey placeholder bars. The final logo's shape is the only drawing.
- **Motion:** one pinned story (the test phases, see "How it works"), entrances per section, feedback on every control, all with a reduced-motion fallback.
- **House rules that bind this site:** headlines two lines at most at every width; no small labels above headings; no monospace outside code; no step numbers; no gradients; no shadows on things at rest; no em or en dashes anywhere in the copy.

## Sections of `/`, as claims with proof

| Section | Claim | Proof on the page |
| --- | --- | --- |
| Hero | MeterX tells you your real speed, from the toolbar | The sentence "Your connection, / honestly measured." split by a live frame. Pressing "Run a quick test" in the frame runs a short test (one 10 MB download and a few pings, about 5 seconds) and the number appears where the word would be. Nothing runs until the visitor presses it, so phones on mobile data are not charged for a visit |
| What your speed can do | A number only matters if you know what it buys | A headline the visitor can type in: "What can **300 Mbps** do?" Under it, the answer at real interface size: video calls, 4K streaming, gaming, uploads, using the same thresholds as the extension. Three examples to tap: 25, 100, 1000 Mbps. Prefilled with the hero result once there is one |
| Features | More than one number | Five rows on one axis, each with an interface fragment in the margin: latency under load and the bufferbloat grade; history and the trend chart; against your ISP plan; reports (a real PDF page, CSV and JSON); private by design (stored in your browser, no account, open source, self-hostable server) |
| How it works | A full test takes about 20 seconds and here is where the time goes | The extension's progress bar enlarged across the page, segments sized by the real phase lengths: connect under a second, latency 2 seconds, download about 9, upload about 9. This is the pinned story: the bar holds while each phase's explanation scrolls past |
| Where it runs | It is in the stores you already use | One sentence of browser names, one lit at a time: "Install MeterX in Firefox, Microsoft Edge, Opera, and soon Chrome." Only browsers with a live listing are named as available |
| Questions | Six honest answers | Is it free? What leaves my browser? Why does it differ from other speed tests? What is bufferbloat? Can I run my own server? When is it coming to Chrome? |
| Close | Install it now | The page's colours inverted: "Test from your toolbar." with the install button for the detected browser |
| Footer | It is open source and made by one person | The GitHub repo address as the large line, links to About, Privacy, Changelog and ajithakdev.com, AGPL notice |

The live test needs care on the worker side: the site's quick test must stay well inside the worker's rate limits and the free plan's request budget (100,000 requests a day). One quick test is about 10 requests, against about 150 for a full extension test. The site origin must be added to the worker's CORS list.

## Brand assets to make once the logo is chosen

The five logo options are in the session scratchpad. After the choice:

| Asset | Size | Used by |
| --- | --- | --- |
| Toolbar and store icons | 16, 32, 48, 128 px PNG, plus SVG | Extension manifest, all stores |
| Store logo | 300 x 300 | Edge Add-ons |
| Small promo tile | 440 x 280 | Chrome Web Store, Edge |
| Marquee banner | 1400 x 560 | Chrome Web Store, Edge |
| Screenshots | 1280 x 800, five of them | All stores: popup result, side panel history, live test, settings, PDF report |
| Open Graph card | 1200 x 630 | The site and share links, in the same style as the s-portfolio card |
| GitHub social preview | 1280 x 640 | Repo page |
| Favicon set | SVG, 32 px, 180 px Apple touch, 512 px maskable | The site |

Store sizes change; check each store's upload page before exporting. Opera's listing sizes are not confirmed yet.

## Store links

| Store | URL |
| --- | --- |
| Firefox Add-ons | `https://addons.mozilla.org/firefox/addon/meterx-by-ajithakdev/` |
| Microsoft Edge Add-ons | To fill in from the Partner Center listing |
| Opera Add-ons | To fill in from the Opera listing |
| Chrome Web Store | Not listed yet; `/get` falls back to the site |

## Order of work

1. Pick the logo, then make the icon set and swap it into the extension.
2. `apps/site` skeleton, tokens shared with the extension's `app.css`, Cloudflare Pages project and DNS.
3. `/privacy` and `/r/` first: the stores and the extension's share button need them before 2027.0.0 ships.
4. `/` hero with the live quick test, then the other sections, then `/about` and `/get`.
5. Store screenshots and banners from the finished UI; OG card and social preview.
6. `docs/SEO.md`, `RESOURCES-AND-GUIDE.md` rows for the site, the portfolio entry.

## Open questions for the owner

- The Edge and Opera listing URLs.
- Whether the footer's large line should be the GitHub repo or an email address.
- Whether the site's quick test is welcome on the worker, or the hero should show a recorded result instead.
