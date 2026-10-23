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

wireInstall();
entrances();
const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
