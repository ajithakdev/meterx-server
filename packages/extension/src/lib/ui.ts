/**
 * Rendering shared by the popup and the side panel. DOM only, no storage.
 * @license AGPL-3.0
 */

import type { Grade, HistoryEntry, IspPlan, Phase } from '@meterx/shared';
import { NONE, fmt } from './format';
import { USE_CASES, qualityOf, scoreUseCases, type UseCaseScores } from './quality';

export { USE_CASES };

// Where each phase starts on a progress bar and how long it usually takes.
const PHASE_PLAN: Partial<Record<Phase, { from: number; to: number; ms: number }>> = {
    connect: { from: 0, to: 4, ms: 600 },
    latency: { from: 4, to: 12, ms: 2000 },
    download: { from: 12, to: 56, ms: 8600 },
    upload: { from: 56, to: 100, ms: 8600 },
};

/** Glides a progress fill across a phase's share of the bar. Returns the phase's start percent. */
export function animatePhase(fill: HTMLElement, p: Phase): number | undefined {
    const plan = PHASE_PLAN[p];
    if (!plan) return undefined;
    fill.style.transition = 'none';
    fill.style.width = `${plan.from}%`;
    void fill.offsetWidth; // restart the transition from this phase's start
    fill.style.transition = `width ${plan.ms}ms linear`;
    fill.style.width = `${plan.to}%`;
    return plan.from;
}

/** The MeterX mark: a dial with download (blue) and upload arrows crossing into an X. Uses the theme's tokens. */
export const MARK_SVG = `<svg class="mark" viewBox="0 0 128 128" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><defs><mask id="mx-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128"><rect width="128" height="128" fill="#fff"/><path d="M48 80L80 48" stroke="#000" stroke-width="22"/></mask></defs><path d="M33.6 94.4A43 43 0 1 1 94.4 94.4" stroke-width="10" style="stroke:var(--control)"/><g mask="url(#mx-cut)" stroke-width="12" style="stroke:var(--data)"><path d="M46 46L78 78"/><path d="M84 64V84H64"/></g><g stroke-width="12" stroke="currentColor"><path d="M48 80L80 48"/><path d="M62 46H82V66"/></g></svg>`;

const EDGE_NAMES: Record<string, string> = {
    BOM: 'Mumbai', MAA: 'Chennai', DEL: 'Delhi', BLR: 'Bengaluru', HYD: 'Hyderabad', CCU: 'Kolkata',
    AMD: 'Ahmedabad', COK: 'Kochi', NAG: 'Nagpur', PNQ: 'Pune', SIN: 'Singapore', HKG: 'Hong Kong',
    NRT: 'Tokyo', KIX: 'Osaka', ICN: 'Seoul', SYD: 'Sydney', MEL: 'Melbourne', LHR: 'London',
    FRA: 'Frankfurt', CDG: 'Paris', AMS: 'Amsterdam', MAD: 'Madrid', MXP: 'Milan', IAD: 'Washington',
    EWR: 'Newark', SJC: 'San Jose', LAX: 'Los Angeles', SEA: 'Seattle', ORD: 'Chicago', DFW: 'Dallas',
    ATL: 'Atlanta', MIA: 'Miami', YYZ: 'Toronto', GRU: 'São Paulo', JNB: 'Johannesburg', DXB: 'Dubai',
    KUL: 'Kuala Lumpur', BKK: 'Bangkok', CGK: 'Jakarta', MNL: 'Manila', DAC: 'Dhaka', CMB: 'Colombo', KTM: 'Kathmandu',
};

export function edgeName(code?: string): string | undefined {
    return code ? (EDGE_NAMES[code] ? `${EDGE_NAMES[code]} (${code})` : code) : undefined;
}

/** "Jio · tested via Mumbai (BOM)" */
export function scopeLine(e: HistoryEntry | undefined, custom: boolean): string {
    const via = custom ? 'your own server' : edgeName(e?.edge) ? `Cloudflare ${edgeName(e?.edge)}` : 'Cloudflare edge';
    return e?.isp ? `${e.isp} · via ${via}` : `Testing via ${via}`;
}

/** Sets a figure, or a grey dash at the same size when it is missing. */
export function setFigure(el: HTMLElement, value: string): void {
    el.textContent = value;
    el.classList.toggle('dash', value === NONE);
}


export function useCasesOf(e: HistoryEntry | undefined): UseCaseScores | null {
    if (!e || e.downloadSpeed === undefined || e.uploadSpeed === undefined || e.ping === undefined) return null;
    return scoreUseCases(e.downloadSpeed, e.uploadSpeed, e.ping, e.jitter, e.packetLoss);
}

/** Fills a .ready list, keeping every row in place (a dash when there is no result). */
export function renderReady(list: HTMLElement, e: HistoryEntry | undefined): void {
    const s = useCasesOf(e);
    list.innerHTML = USE_CASES.map(u => {
        const score = s?.[u.key];
        return `<li><span class="k">${u.label}</span><span class="pill ${score ? `s-${score}` : ''}">${score ? u.words[score] : NONE}</span></li>`;
    }).join('');
}

/** The one-line answer under the figure: share of the plan, then what the connection is good for. */
export function findingFor(e: HistoryEntry | undefined, plan: IspPlan | null): string {
    const s = useCasesOf(e);
    if (!e || !s) return 'Run a test to see what this connection can handle.';
    const parts: string[] = [];
    if (plan && plan.downloadMbps > 0 && e.downloadSpeed !== undefined) {
        parts.push(`${Math.round((e.downloadSpeed / plan.downloadMbps) * 100)}% of your ${plan.downloadMbps} Mbps plan.`);
    }
    const good = USE_CASES.filter(u => s[u.key] === 'good');
    const worst = USE_CASES.find(u => s[u.key] === 'poor') ?? USE_CASES.find(u => s[u.key] === 'okay');
    if (good.length === USE_CASES.length) parts.push('Ready for calls, 4K, gaming and big uploads.');
    else if (good.length && worst) parts.push(`Good for ${good.map(u => u.label.toLowerCase()).join(', ')}; ${worst.label.toLowerCase()}: ${worst.words[s[worst.key]].toLowerCase()}.`);
    else if (worst) parts.push(`${worst.label}: ${worst.words[s[worst.key]].toLowerCase()}. Try closer to the router.`);
    return parts.join(' ');
}

export function setQualityPill(el: HTMLElement, e: HistoryEntry | undefined): void {
    const q = qualityOf(e);
    el.className = `pill ${q ? `q-${q.cls}` : 'is-empty'}`;
    el.textContent = q ? q.label : 'Quality';
}

/** Idle vs loaded latency rows; bars share one scale so the rise is visible. */
export function renderLoad(rows: HTMLElement, gradeEl: HTMLElement, e: Partial<HistoryEntry> | undefined): void {
    const vals = [e?.ping, e?.loadedPingDown, e?.loadedPingUp];
    const max = Math.max(1, ...vals.filter((v): v is number => v !== undefined));
    rows.querySelectorAll<HTMLElement>('.load-row').forEach((row, i) => {
        const v = vals[i];
        (row.querySelector('.track > i') as HTMLElement).style.width = v === undefined ? '0%' : `${Math.max(2, (v / max) * 100)}%`;
        setFigure(row.querySelector('.v') as HTMLElement, v === undefined ? NONE : `${fmt(v, 0)} ms`);
    });
    const g = e?.bufferbloatGrade;
    gradeEl.className = `pill ${g ? gradeClass(g) : 'is-empty'}`;
    gradeEl.textContent = g ? `Grade ${g}` : 'Grade';
}

const gradeClass = (g: Grade) => (g === 'A' || g === 'B' ? 's-good' : g === 'C' ? 's-okay' : 's-poor');

/** Wires a button to a floating menu: click toggles, Escape and outside clicks close, focus moves in. */
export function bindMenu(button: HTMLButtonElement, menu: HTMLElement, onPick: (value: string) => void): void {
    const close = () => { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); };
    button.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const open = menu.hidden;
        menu.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        if (open) menu.querySelector<HTMLElement>('button')?.focus();
    });
    menu.addEventListener('click', (ev) => {
        const item = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-value]');
        if (!item) return;
        close();
        onPick(item.dataset.value!);
    });
    document.addEventListener('click', (ev) => { if (!menu.contains(ev.target as Node)) close(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !menu.hidden) { close(); button.focus(); } });
}
