/**
 * Plain-language explanations for metric names, from [data-tip] attributes.
 * The text is linked with aria-describedby, so screen readers still read the value first (#73).
 * @license AGPL-3.0
 */

export const TOOLTIP_COPY: Record<string, string> = {
    download: 'How fast data reaches you. Higher means faster pages and video.',
    upload: 'How fast you can send data. Matters for calls and backups.',
    ping: 'Time for a round trip to the server when the line is quiet. Under 30 ms feels instant.',
    jitter: 'How much ping changes from moment to moment. Low means steady calls.',
    'packet-loss': 'Share of test requests that never came back. Over 1% causes stutters.',
    bufferbloat: 'How much ping rises while the line is busy. A is smooth, F means lag during downloads.',
};

export function bindTooltips(root: ParentNode): void {
    let tip: HTMLElement | null = null;
    const hide = () => { if (tip) tip.hidden = true; };
    root.querySelectorAll<HTMLElement>('[data-tip]').forEach((el, i) => {
        const text = TOOLTIP_COPY[el.dataset.tip!];
        if (!text) return;
        const desc = document.createElement('span');
        desc.id = `tip-${i}`;
        desc.className = 'sr-only';
        desc.textContent = text;
        el.append(desc);
        el.setAttribute('aria-describedby', desc.id);
        if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
        const show = () => {
            tip ??= Object.assign(document.body.appendChild(document.createElement('div')), { className: 'mx-tooltip', role: 'presentation' });
            tip.textContent = text;
            tip.hidden = false;
            const r = el.getBoundingClientRect();
            const w = tip.offsetWidth;
            tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
            tip.style.top = `${r.bottom + 6}px`;
        };
        el.addEventListener('mouseenter', show);
        el.addEventListener('focus', show);
        el.addEventListener('mouseleave', hide);
        el.addEventListener('blur', hide);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
}
