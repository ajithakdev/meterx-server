/**
 * ISP advertised-plan comparison.
 * Stores user's plan in chrome.storage.sync. Renders delivered % vs paid.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { IspPlan, HistoryEntry } from '@meterx/shared';

const KEY = 'ispPlan';

export async function loadIspPlan(): Promise<IspPlan | null> {
    const r = await chrome.storage.sync.get(KEY);
    return (r[KEY] as IspPlan | undefined) ?? null;
}

export async function saveIspPlan(plan: IspPlan | null): Promise<void> {
    if (plan === null) {
        await chrome.storage.sync.remove(KEY);
    } else {
        await chrome.storage.sync.set({ [KEY]: plan });
    }
}

export function renderIspComparison(el: HTMLElement, last: HistoryEntry | undefined, plan: IspPlan | null): void {
    if (!plan) { el.classList.add('hidden'); return; }
    if (!last || last.downloadSpeed === undefined) { el.classList.add('hidden'); return; }

    const dlPct = plan.downloadMbps > 0 ? (last.downloadSpeed / plan.downloadMbps) * 100 : 0;
    const ulPct = plan.uploadMbps > 0 && last.uploadSpeed !== undefined ? (last.uploadSpeed / plan.uploadMbps) * 100 : 0;

    const dlCls = cls(dlPct);
    const ulCls = cls(ulPct);

    el.classList.remove('hidden');
    el.innerHTML = `
      <div class="isp-head">
        <span class="isp-label">vs plan${plan.providerName ? ` (${escapeHtml(plan.providerName)})` : ''}</span>
        <span class="isp-plan">${plan.downloadMbps}↓ / ${plan.uploadMbps}↑ Mbps</span>
      </div>
      <div class="isp-bars">
        <div class="isp-row ${dlCls}">
          <span class="isp-k">Download</span>
          <span class="isp-v">${dlPct.toFixed(0)}% of paid</span>
        </div>
        ${last.uploadSpeed !== undefined ? `
        <div class="isp-row ${ulCls}">
          <span class="isp-k">Upload</span>
          <span class="isp-v">${ulPct.toFixed(0)}% of paid</span>
        </div>` : ''}
      </div>
    `;
}

function cls(pct: number): string {
    if (pct >= 80) return 'ok';
    if (pct >= 50) return 'warn';
    return 'bad';
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
