/**
 * Every page: install buttons for the visitor's browser, and section entrances.
 * @license AGPL-3.0
 */

import { STORES, detectStore } from './stores';

/** Points every [data-install] link at the visitor's store, or at the install list when there is no live listing. */
export function wireInstall(): void {
    const id = detectStore(navigator.userAgent);
    const store = id ? STORES[id] : null;
    document.querySelectorAll<HTMLAnchorElement>('a[data-install]').forEach(a => {
        if (store?.url) {
            a.href = store.url;
            a.textContent = a.dataset.install === 'short' ? `Add to ${store.name}` : `Add to ${store.name}, free`;
        }
    });
}

/** Parts of each section rise in once as the section enters. Content is visible without script or with reduced motion. */
function entrances(): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const parts = document.querySelectorAll<HTMLElement>('[data-enter] > *');
    parts.forEach((el, i) => { el.classList.add('pre'); el.style.setProperty('--i', String(i % 6)); });
    const io = new IntersectionObserver(entries => {
        for (const e of entries) if (e.isIntersecting) { e.target.querySelectorAll('.pre').forEach(el => el.classList.remove('pre')); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('[data-enter]').forEach(s => io.observe(s));
}

/** Marks the current page in the header and gives the header an edge once the page scrolls under it. */
function chrome(): void {
    const path = location.pathname;
    document.querySelectorAll<HTMLAnchorElement>('.links a').forEach(a => {
        if (path.startsWith(a.getAttribute('href')!)) a.setAttribute('aria-current', 'page');
    });
    const bar = document.querySelector('.site-bar');
    const menu = bar?.querySelector<HTMLButtonElement>('.menu-btn');
    const setOpen = (open: boolean) => { bar?.classList.toggle('is-open', open); menu?.setAttribute('aria-expanded', String(open)); };
    menu?.addEventListener('click', () => setOpen(!bar!.classList.contains('is-open')));
    bar?.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
    const onScroll = () => bar?.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

/** Frames marked data-fit take the height their page reports, so the frame never scrolls on its own. */
function fitFrames(): void {
    document.querySelectorAll<HTMLIFrameElement>('iframe.device').forEach(f => f.setAttribute('scrolling', 'no'));
    // On phones the side panel frames switch to flow mode and take their full height too.
    if (matchMedia('(max-width: 900px)').matches) {
        document.querySelectorAll<HTMLIFrameElement>('iframe.device.panel').forEach(f => {
            f.dataset.fit = '';
            f.setAttribute('scrolling', 'no');
            f.addEventListener('load', () => f.contentWindow?.postMessage({ mxDemo: 'flow' }, location.origin));
        });
    }
    addEventListener('message', e => {
        if (e.origin !== location.origin || e.data?.mxDemo !== 'height') return;
        document.querySelectorAll<HTMLIFrameElement>('iframe[data-fit]').forEach(f => {
            if (f.contentWindow === e.source) f.style.height = `${e.data.h}px`;
        });
    });
}

/** Long documents get an on-page contents list beside them, built from their section headings. */
function toc(): void {
    const doc = document.querySelector('main.doc'), body = doc?.querySelector('.body');
    const heads = [...(body?.querySelectorAll<HTMLHeadingElement>(':scope > h2') ?? [])];
    if (!doc || !body || heads.length < 3) return;
    const nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', 'On this page');
    nav.innerHTML = '<p>On this page</p>';
    heads.forEach((h, i) => {
        h.id ||= `s${i + 1}`;
        const a = document.createElement('a');
        a.href = `#${h.id}`;
        a.textContent = h.textContent;
        nav.append(a);
    });
    const content = document.createElement('div');
    content.className = 'content';
    content.append(...body.childNodes);
    body.append(nav, content);
    doc.classList.add('has-toc');
    const links = [...nav.querySelectorAll('a')];
    const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle('is-here', a.hash === `#${e.target.id}`));
    }), { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(h => io.observe(h));
}

wireInstall();
entrances();
toc();
chrome();
fitFrames();
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
