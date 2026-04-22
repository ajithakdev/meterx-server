/**
 * Side-panel trend chart — inline SVG, no deps.
 * Shows download (cyan), upload (purple), ping (green) on a shared time axis.
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';

const W = 560;
const H = 120;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18;

export function renderChart(el: HTMLElement, history: HistoryEntry[]): void {
    const entries = history.slice(0, 60).reverse();
    if (entries.length < 2) {
        el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--t3);font-size:11px">Run two tests to see the trend.</div>';
        return;
    }

    const dl = entries.map(e => e.downloadSpeed ?? null);
    const ul = entries.map(e => e.uploadSpeed ?? null);
    const pi = entries.map(e => e.ping ?? null);
    const times = entries.map(e => e.timestamp);

    const speedMax = Math.max(1, ...dl.filter((v): v is number => v !== null), ...ul.filter((v): v is number => v !== null));
    const pingMax = Math.max(1, ...pi.filter((v): v is number => v !== null));

    const xStep = (W - PAD_L - PAD_R) / (entries.length - 1);
    const xAt = (i: number) => PAD_L + i * xStep;
    const yAtSpeed = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / speedMax);
    const yAtPing  = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / pingMax);

    const path = (vals: (number | null)[], mapY: (v: number) => number): string => {
        let d = '';
        let open = false;
        vals.forEach((v, i) => {
            if (v === null) { open = false; return; }
            d += `${open ? 'L' : 'M'}${xAt(i).toFixed(1)},${mapY(v).toFixed(1)} `;
            open = true;
        });
        return d.trim();
    };

    const dlPath = path(dl, yAtSpeed);
    const ulPath = path(ul, yAtSpeed);
    const piPath = path(pi, yAtPing);

    const firstLabel = new Date(times[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const lastLabel = new Date(times[times.length - 1]).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    el.innerHTML = `
      <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Network speed and ping trend">
        <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" stroke="rgba(255,255,255,0.06)"/>
        <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${H - PAD_B}" stroke="rgba(255,255,255,0.06)"/>
        <text x="${PAD_L - 4}" y="${PAD_T + 8}" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="8">${speedMax.toFixed(0)}</text>
        <text x="${PAD_L - 4}" y="${H - PAD_B}" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="8">0</text>
        <text x="${PAD_L}" y="${H - 4}" fill="rgba(255,255,255,0.3)" font-size="8">${firstLabel}</text>
        <text x="${W - PAD_R}" y="${H - 4}" text-anchor="end" fill="rgba(255,255,255,0.3)" font-size="8">${lastLabel}</text>
        <path d="${dlPath}" fill="none" stroke="#00c8ff" stroke-width="1.5"/>
        <path d="${ulPath}" fill="none" stroke="#a855f7" stroke-width="1.5"/>
        <path d="${piPath}" fill="none" stroke="#34d399" stroke-width="1" stroke-dasharray="2,2"/>
        <g font-size="8" fill="rgba(255,255,255,0.55)">
          <rect x="${W - 110}" y="${PAD_T}" width="8" height="2" fill="#00c8ff"/><text x="${W - 98}" y="${PAD_T + 4}">Down</text>
          <rect x="${W - 70}"  y="${PAD_T}" width="8" height="2" fill="#a855f7"/><text x="${W - 58}" y="${PAD_T + 4}">Up</text>
          <rect x="${W - 40}"  y="${PAD_T}" width="8" height="2" fill="#34d399"/><text x="${W - 28}" y="${PAD_T + 4}">Ping</text>
        </g>
      </svg>
    `;
}
