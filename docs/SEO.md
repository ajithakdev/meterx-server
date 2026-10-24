# SEO guide

How search and link previews work on `meterx.ajithakdev.com`, what to set up once, and what to check on every release.

## How the site handles SEO

- Every page is plain static HTML in `apps/site/static/`, so crawlers get the full text, title and meta tags without running JavaScript.
- Each page has its own `<title>`, `<meta name="description">`, `<link rel="canonical">`, Open Graph tags (`og:type`, `og:url`, `og:site_name`, title, description, image) and `twitter:card` in its `<head>`. The home page also carries `SoftwareApplication` and `WebSite` JSON-LD; the second one gives Google the site name.
- `apps/site/static/sitemap.xml` lists the eight indexable pages (Home, How it works, Features, Questions, About, Contribute, Get MeterX, Privacy). Update it by hand when a page is added or removed.
- `apps/site/static/robots.txt` allows everything except `/r/` (shared results) and `/app/` (the extension's demo pages, shown inside frames). `/get/` is indexable; its `?go` form redirects to a store and its canonical points back at `/get/`.
- The share viewer and 404 pages carry `noindex`.
- `apps/site/static/img/og.png` (1200x630) is the preview image for shared links. `brand/build.mjs` makes it.
- The site is served by Cloudflare Pages (project `meterx-site`, direct upload, so merges never deploy) on the `ajithakdev.com` zone. Cloudflare Crawler Hints, if turned on for the zone, notify IndexNow on changes.

## One-time setup

Do these once. Tick them off here when done.

- [ ] Google Search Console: the `ajithakdev.com` Domain property (set up for the portfolio) already covers `meterx.ajithakdev.com`. Submit `https://meterx.ajithakdev.com/sitemap.xml` under Sitemaps.
- [ ] Bing Webmaster Tools: add `https://meterx.ajithakdev.com` (or import from Search Console) and submit the same sitemap.
- [ ] In Search Console, URL Inspection on `https://meterx.ajithakdev.com/`, then "Request indexing".
- [ ] Link the site from each store listing's website field (Firefox, Edge, Opera), and set each listing's privacy policy URL to `https://meterx.ajithakdev.com/privacy/`.
- [ ] Add the GitHub repo's website field: `https://meterx.ajithakdev.com`.

## Release checklist

A minor release (copy edits, small fixes) only needs the first section. A major release (new page, removed page, renamed URL) needs all of it.

### Every release

- [ ] `npm run build` passes.
- [ ] After deploy, each page returns its own title:
  ```sh
  for p in "" how-it-works/ features/ faq/ about/ contribute/ get/ privacy/; do curl -s https://meterx.ajithakdev.com/$p | grep -o '<title>[^<]*</title>'; done
  ```
- [ ] A changed title stays under about 60 characters, a description under about 160.

### Major release

- [ ] New page: add it to `sitemap.xml`, give it a unique title, description and canonical URL, and add it to the header and footer partials in `apps/site/static/_partials/`.
- [ ] Removed or renamed page: add a 301 in `apps/site/static/_redirects` (create it if missing). Never let an old URL return a 404 if anyone might have linked to it.
- [ ] Link preview looks right: paste the URL into https://www.linkedin.com/post-inspector/.
- [ ] Lighthouse SEO score in Chrome DevTools is 100 on the changed pages, on mobile.
- [ ] Resubmit the sitemap in Search Console and request indexing on new or changed pages.

## Monthly check

- Search Console Pages report: anything "not indexed" that should be, and why.
- Core Web Vitals: anything poor on mobile. The home page loads the popup in a frame; watch its LCP.
- Performance: which searches bring people in, and whether a title or description should say it more clearly.
