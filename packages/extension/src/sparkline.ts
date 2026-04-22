/**
 * Tiny inline SVG sparkline for download-speed trend.
 * Pure data -> markup; no runtime deps.
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';

const W = 220;
const H = 36;
const PAD = 2;

export function renderSparkline(el: HTMLElement, history: HistoryEntry[]): void {
    const pts = history
        .slice(0, 30)
        .reverse()
        .map(e => e.downloadSpeed)
        .filter((v): v is number => v !== undefined);

    if (pts.length < 2) {
        el.innerHTML = '';
        el.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');

    const max = Math.max(...pts);
    const min = Math.min(...pts);
    const range = max - min || 1;
    const stepX = (W - PAD * 2) / (pts.length - 1);

    const coords = pts.map((v, i) => {
        const x = PAD + i * stepX;
        const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
        return [x, y] as const;
    });

    const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L${(W - PAD).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

    const latest = pts[pts.length - 1];
    const latestX = coords[coords.length - 1][0].toFixed(1);
    const latestY = coords[coords.length - 1][1].toFixed(1);

    el.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Download speed trend sparkline">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#00c8ff" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#00c8ff" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#sparkFill)"/>
        <path d="${linePath}" fill="none" stroke="#00c8ff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${latestX}" cy="${latestY}" r="2.2" fill="#00c8ff"/>
      </svg>
      <div class="spark-meta"><span>${pts.length} tests</span><span>${latest.toFixed(1)} Mbps</span></div>
    `;
}
