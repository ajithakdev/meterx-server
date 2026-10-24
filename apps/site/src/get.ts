/**
 * Get MeterX: every store on the brand's dial, with the needle pointing at the visitor's own browser.
 * /get/?go skips the page and goes straight to the visitor's store, for links in posts and bios.
 * @license AGPL-3.0
 */

import { PLACES, STORES, detectStore } from './stores';

const id = detectStore(navigator.userAgent);
const mine = id ? STORES[id] : null;
if (new URLSearchParams(location.search).has('go') && mine?.url) location.replace(mine.url);

const $ = (i: string) => document.getElementById(i)!;
const logo = (p: (typeof PLACES)[number]) =>
    `<span class="logo" style="--c:${p.colour};--m:url(/img/stores/${p.logo}.svg)" aria-hidden="true"></span>`;

// The dial: one stop per place along the logo's three-quarter arc, live ones in colour.
const dial = $('dial');
const from = 135, sweep = 270, step = sweep / (PLACES.length - 1);
PLACES.forEach((p, i) => {
    const a = ((from + i * step) * Math.PI) / 180;
    const el = document.createElement('a');
    el.className = `stop${p.url ? ' live' : ''}${p.id === id ? ' mine' : ''}`;
    el.href = p.url || '#next';
    el.style.left = `${50 + 46 * Math.cos(a)}%`;
    el.style.top = `${50 + 46 * Math.sin(a)}%`;
    el.title = `${p.store}: ${p.url ? 'available' : p.note}`;
    el.innerHTML = logo(p);
    dial.append(el);
});

// The needle swings to the visitor's browser, or rests at the top when the browser is unknown.
const target = PLACES.findIndex(p => p.id === id);
const angle = target >= 0 ? from + target * step : 270;
requestAnimationFrame(() => $("needle").style.setProperty("--a", `${angle - 90}deg`));

if (mine) {
    const main = $('getMain') as HTMLAnchorElement;
    const place = PLACES.find(p => p.id === id)!;
    if (mine.url) {
        main.href = mine.url;
        main.textContent = `Add to ${mine.name}, free`;
        $('getLine').textContent = `You are on ${mine.name}. One click installs it from ${place.store}.`;
    } else {
        $('getLine').textContent = `You are on ${mine.name}. ${place.note}; Firefox and Edge have it today.`;
    }
}

const card = (p: (typeof PLACES)[number]) => `<li class="store${p.id === id ? ' mine' : ''}">
  ${logo(p)}
  <div><h3>${p.store}</h3><p>${p.browsers}</p>${p.url ? '' : `<span class="pill">${p.note}</span>`}</div>
  ${p.url ? `<a class="cta cta-sm" href="${p.url}">Install</a>` : ''}
</li>`;
$('storesNow').innerHTML = PLACES.filter(p => p.url).map(card).join('');
$('storesNext').innerHTML = PLACES.filter(p => !p.url).map(card).join('');
