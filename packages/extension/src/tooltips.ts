/**
 * Plain-language tooltips for jargon (jitter, packet loss, etc.).
 * Reads content from [data-tip] attributes on elements.
 * @license AGPL-3.0
 */

export const TOOLTIP_COPY: Record<string, string> = {
    download:    'Speed coming in. Higher = faster pages.',
    upload:      'Speed going out. Matters for calls, backups.',
    ping:        'Round-trip delay. <30ms feels instant.',
    jitter:      'Ping variation. Low = stable calls.',
    'packet-loss': 'Lost packets. >1% causes stutters.',
    quality:     'Overall grade: speed + ping + stability.',
    bufferbloat: 'Ping spike under load. A = smooth, F = bad.',
    'use-cases': 'Pass/fail for common activities.',
};

interface TipState {
    tipEl: HTMLElement | null;
    current: HTMLElement | null;
}

const state: TipState = { tipEl: null, current: null };

function ensureTipEl(): HTMLElement {
    if (state.tipEl) return state.tipEl;
    const el = document.createElement('div');
    el.className = 'mx-tooltip hidden';
    el.setAttribute('role', 'tooltip');
    document.body.appendChild(el);
    state.tipEl = el;
    return el;
}

function showTip(anchor: HTMLElement, text: string): void {
    const tip = ensureTipEl();
    tip.textContent = text;
    tip.classList.remove('hidden');
    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(6, Math.min(window.innerWidth - tipRect.width - 6, left));
    const top = rect.bottom + 6;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    state.current = anchor;
}

function hideTip(): void {
    if (state.tipEl) state.tipEl.classList.add('hidden');
    state.current = null;
}

export function bindTooltips(root: ParentNode): void {
    const nodes = root.querySelectorAll<HTMLElement>('[data-tip]');
    nodes.forEach(el => {
        const key = el.dataset.tip!;
        const text = TOOLTIP_COPY[key] ?? key;
        el.setAttribute('aria-label', text);
        el.setAttribute('tabindex', el.getAttribute('tabindex') ?? '0');
        el.addEventListener('mouseenter', () => showTip(el, text));
        el.addEventListener('mouseleave', hideTip);
        el.addEventListener('focus',      () => showTip(el, text));
        el.addEventListener('blur',       hideTip);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
}
