/**
 * Builds every MeterX brand asset from the mark defined below: SVG masters, extension and site icons,
 * store logo, promo tiles, marquee, social cards and store screenshots.
 *
 * Needs a built extension (npm run build) and a Chromium with Playwright:
 *   PLAYWRIGHT=<path to playwright/index.mjs> CHROMIUM=<path to chromium> node brand/build.mjs
 * @license AGPL-3.0
 */

import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { chromium } = await import(process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const out = (...p) => { const f = resolve(here, ...p); mkdirSync(dirname(f), { recursive: true }); return f; };

// --- The mark: a three-quarter dial with download and upload arrows crossing into an X.
const INK = { dark: '#0b0c0e', light: '#ffffff' };
const COLOURS = {
    onDark: { dial: '#3a3e44', up: '#f4f5f6', down: '#74a6ff' },
    onLight: { dial: '#cdd2d8', up: '#0a0a0a', down: '#1d5fbf' },
};

/** The glyph in a 128 box. The upload arrow cuts a gap through the download arrow with a mask, so it works on any background. */
function glyph(c, id) {
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128"><rect width="128" height="128" fill="#fff"/><path d="M48 80L80 48" stroke="#000" stroke-width="20" stroke-linecap="round"/></mask></defs>`
        + `<path d="M33.6 94.4A43 43 0 1 1 94.4 94.4" fill="none" stroke="${c.dial}" stroke-width="8" stroke-linecap="round"/>`
        + `<g mask="url(#${id})" fill="none" stroke="${c.down}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M46 46L78 78"/><path d="M84 64V84H64"/></g>`
        + `<g fill="none" stroke="${c.up}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M48 80L80 48"/><path d="M62 46H82V66"/></g>`;
}
const svg = (inner, box = 128) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">${inner}</svg>\n`;
const SVG = {
    'mark.svg': svg(`<rect width="128" height="128" rx="28" fill="${INK.dark}"/>${glyph(COLOURS.onDark, 'm')}`),
    'mark-light.svg': svg(`<rect width="128" height="128" rx="28" fill="${INK.light}"/>${glyph(COLOURS.onLight, 'm')}`),
    'glyph-on-dark.svg': svg(glyph(COLOURS.onDark, 'g')),
    'glyph-on-light.svg': svg(glyph(COLOURS.onLight, 'g')),
    // Maskable: full-bleed square, glyph inside the 80% safe zone.
    'maskable.svg': svg(`<rect width="128" height="128" fill="${INK.dark}"/><g transform="translate(19.2 19.2) scale(.7)">${glyph(COLOURS.onDark, 'k')}</g>`),
};
for (const [name, body] of Object.entries(SVG)) writeFileSync(out('svg', name), body);

const uri = s => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`;
const font = readFileSync(resolve(root, 'apps/extension/static/fonts/Geist-Variable.woff2')).toString('base64');
const page = (w, h, bg, body, css = '') => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900}
*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}body{background:${bg};font-family:Geist,sans-serif;-webkit-font-smoothing:antialiased}${css}</style>${body}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
async function render(html, w, h, file, transparent = false) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out(file), omitBackground: transparent });
    await p.close();
}
const img = (s, size) => `<img src="${uri(s)}" width="${size}" height="${size}" style="display:block">`;

// --- Icons
for (const size of [16, 32, 48, 96, 128, 256, 512]) await render(page(size, size, 'transparent', img(SVG['mark.svg'], size)), size, size, `png/icons/icon-${size}.png`, true);
await render(page(512, 512, INK.dark, img(SVG['maskable.svg'], 512)), 512, 512, 'png/icons/maskable-512.png');
await render(page(180, 180, INK.dark, img(SVG['maskable.svg'], 180)), 180, 180, 'png/icons/apple-touch-180.png');
await render(page(300, 300, 'transparent', img(SVG['mark.svg'], 300)), 300, 300, 'png/store/edge-logo-300.png', true);

// --- Wordmark lockups
const lockup = (theme) => {
    const dark = theme === 'dark';
    return page(1200, 400, dark ? INK.dark : '#f2f4f7', `<div class="l">${img(SVG[dark ? 'mark.svg' : 'mark-light.svg'], 200)}<span>MeterX</span></div>`,
        `.l{height:100%;display:flex;align-items:center;justify-content:center;gap:48px}.l span{font-size:150px;font-weight:600;letter-spacing:-.04em;color:${dark ? '#f4f5f6' : '#0a0a0a'}}${dark ? '' : '.l img{box-shadow:0 0 0 2px #e1e4e8;border-radius:44px}'}`);
};
await render(lockup('dark'), 1200, 400, 'png/lockup-on-dark.png');
await render(lockup('light'), 1200, 400, 'png/lockup-on-light.png');

// --- Real interface captures from the built extension, with sample results (a 300/100 plan, a week of tests).
const dist = resolve(root, 'apps/extension/dist');
const now = Date.now() - 30 * 60e3;
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hist = Array.from({ length: 30 }, (_, i) => {
    const ping = 18 + rnd() * 8, dl = 262 + rnd() * 40 - (i === 9 ? 120 : 0);
    return { timestamp: now - i * 5.6 * 3600e3, downloadSpeed: dl, uploadSpeed: 88 + rnd() * 10, ping, jitter: 1.5 + rnd() * 2.5, packetLoss: 0,
        bufferbloatDelta: 30 + rnd() * 20, bufferbloatGrade: 'B', loadedPingDown: ping + 42, loadedPingUp: ping + 27, ipv4Ok: true, ipv6Ok: true, edge: 'MAA', isp: 'Airtel' };
});
const sync = { ispPlan: { downloadMbps: 300, uploadMbps: 100, providerName: 'Airtel' } };
const stub = `window.__l=[];window.chrome={storage:{sync:{get:async(k)=>{const s=${JSON.stringify(sync)};return typeof k==='string'?{[k]:s[k]}:s},set:async()=>{}},`
    + `local:{get:async()=>({history:${JSON.stringify(hist)}}),set:async()=>{}},onChanged:{addListener(){}}},`
    + `runtime:{sendMessage:async(m)=>m&&m.action==='getState'?null:{ok:true,ping:19,edge:'MAA'},onMessage:{addListener(f){__l.push(f)}},getURL:x=>x,openOptionsPage(){}},`
    + `permissions:{contains:async()=>true,request:async()=>true}};window.__send=m=>__l.forEach(f=>f(m));`;
async function capture(file, w, h, scheme, name, act) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2 });
    await p.addInitScript(stub);
    await p.goto(pathToFileURL(resolve(dist, file)).href);
    await p.waitForTimeout(600);
    if (act) await act(p);
    const height = await p.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height));
    await p.screenshot({ path: out('png/ui', name), clip: { x: 0, y: 0, width: w, height: Math.min(h, height) } });
    await p.close();
}
for (const scheme of ['dark', 'light']) await capture('popup.html', 360, 600, scheme, `popup-${scheme}.png`);
await capture('sidepanel.html', 420, 880, 'light', 'panel-light.png');
await capture('sidepanel.html', 420, 880, 'light', 'live-light.png', async p => {
    await p.click('#runBtn');
    for (const data of [{ phase: 'latency', ping: 19 }, { phase: 'download', downloadSpeed: 284.6 }, { phase: 'upload', uploadSpeed: 61.2 }]) {
        await p.evaluate(d => window.__send({ action: 'testProgress', data: d }), data);
        await p.waitForTimeout(900);
    }
});
await capture('options.html', 1000, 760, 'light', 'settings-light.png');
if (process.env.REPORT_PNG) copyFileSync(process.env.REPORT_PNG, out('png/ui/report.png'));

// --- Banners and social cards: dark ground, the mark large, the name and one line.
function banner(w, h, markSize, title, line, shot) {
    const pad = Math.round(h * 0.17);
    const ghost = `<img class="ghost" src="${uri(SVG['glyph-on-dark.svg'])}">`;
    return page(w, h, INK.dark, `${ghost}<div class="b">${img(SVG['mark.svg'], markSize)}<div><h1>${title}</h1><p>${line}</p></div></div>${shot ? `<img class="shot" src="${shot}">` : ''}`,
        `.b{position:absolute;left:${pad}px;top:0;bottom:0;display:flex;align-items:center;gap:${Math.round(markSize * .3)}px}
         h1{font-size:${Math.round(h * .16)}px;font-weight:600;letter-spacing:-.04em;line-height:1;color:#f4f5f6}
         p{font-size:${Math.round(h * .055)}px;line-height:1.3;color:#a4a8ae;margin-top:${Math.round(h * .03)}px;max-width:${shot ? 15 : 20}ch}
         .ghost{position:absolute;right:${-h * .25}px;bottom:${-h * .35}px;width:${h * 1.15}px;height:${h * 1.15}px;opacity:.07}
         .shot{position:absolute;right:${pad}px;top:50%;transform:translateY(-50%);height:${Math.round(h * .86)}px;border-radius:14px}`);
}
const popupDark = readFileSync(out('png/ui/popup-dark.png')).toString('base64');
const popupShot = `data:image/png;base64,${popupDark}`;
await render(banner(440, 280, 76, 'MeterX', 'Speed, ping and bufferbloat from your toolbar.'), 440, 280, 'png/store/promo-440x280.png');
await render(banner(1400, 560, 170, 'MeterX', 'Internet speed, ping and bufferbloat from your browser toolbar.', popupShot), 1400, 560, 'png/store/marquee-1400x560.png');
await render(banner(1200, 630, 190, 'MeterX', 'Internet speed, ping and bufferbloat from your browser toolbar.'), 1200, 630, 'png/social/og-1200x630.png');
await render(banner(1280, 640, 190, 'MeterX', 'Open-source speed test for the browser toolbar.'), 1280, 640, 'png/social/github-1280x640.png');

// --- Store screenshots, 1280 x 800: a caption on the left, the real interface on the right.
const shots = [
    ['popup-light.png', 'Your speed, in one click', 'Download, upload, ping, jitter and loss, with a plain answer about what the connection can handle.'],
    ['panel-light.png', 'Every test, kept on your device', 'Averages, a trend chart and up to 200 results in the side panel.'],
    ['live-light.png', 'Watch the test as it runs', 'Live figures and a progress line while each phase is measured.'],
    ['settings-light.png', 'Your plan, your schedule, your server', 'Compare with the speeds you pay for, test on a timer, or use your own server.'],
    ['report.png', 'Reports you can hand to your provider', 'A PDF with averages, a trend and every result, plus CSV and JSON.'],
];
for (const [i, [file, title, line]] of shots.entries()) {
    const data = readFileSync(out('png/ui', file)).toString('base64');
    await render(page(1280, 800, '#f2f4f7', `<div class="c"><h1>${title}</h1><p>${line}</p></div><div class="s"><img src="data:image/png;base64,${data}"></div>`,
        `.c{position:absolute;left:80px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center}
         h1{font-size:52px;font-weight:600;letter-spacing:-.035em;line-height:1.02;color:#0a0a0a}p{font-size:22px;line-height:1.4;color:#5b6068;margin-top:20px}
         .s{position:absolute;left:600px;right:60px;top:40px;bottom:40px;display:flex;align-items:center;justify-content:center}
         .s img{max-width:100%;max-height:100%;border-radius:14px;box-shadow:0 0 0 1px #e1e4e8}`), 1280, 800, `png/store/screenshot-${i + 1}-1280x800.png`);
}

await browser.close();

// --- Copy into the extension and the site.
const ext = resolve(root, 'apps/extension/static/images');
mkdirSync(ext, { recursive: true });
for (const s of [16, 32, 48, 128]) copyFileSync(out(`png/icons/icon-${s}.png`), resolve(ext, `icon-${s}.png`));
const site = resolve(root, 'apps/site/static/img');
mkdirSync(site, { recursive: true });
copyFileSync(out('svg/mark.svg'), resolve(site, 'mark.svg'));
copyFileSync(out('png/icons/icon-32.png'), resolve(site, 'icon-32.png'));
copyFileSync(out('png/icons/apple-touch-180.png'), resolve(site, 'apple-touch-icon.png'));
copyFileSync(out('png/icons/maskable-512.png'), resolve(site, 'maskable-512.png'));
copyFileSync(out('png/social/og-1200x630.png'), resolve(site, 'og.png'));
console.log('Brand assets written to brand/ and copied into the extension and the site.');
