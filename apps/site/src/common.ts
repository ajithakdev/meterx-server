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

wireInstall();
entrances();
chrome();
fitFrames();
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
