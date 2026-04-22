/**
 * History storage + rendering
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { HistoryEntry } from '@meterx/shared';
import { fmt } from './format';
import { getQualityClass } from './quality';

export const MAX_HISTORY = 200;
export const HISTORY_DISPLAY = 7;

export async function saveHistory(entry: HistoryEntry): Promise<void> {
    const result = await chrome.storage.local.get('history');
    const history: HistoryEntry[] = result.history || [];
    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    await chrome.storage.local.set({ history });
}

export async function loadHistory(limit = HISTORY_DISPLAY): Promise<HistoryEntry[]> {
    const result = await chrome.storage.local.get('history');
    return (result.history || []).slice(0, limit);
}

export async function loadAllHistory(): Promise<HistoryEntry[]> {
    const result = await chrome.storage.local.get('history');
    return result.history || [];
}

export function renderHistory(list: HTMLElement, entries: HistoryEntry[]): void {
    if (entries.length === 0) {
        list.innerHTML = '<div class="history-item" style="justify-content:center;color:var(--t3)">No tests yet</div>';
        return;
    }
    list.innerHTML = entries.map(e => {
        const d = new Date(e.timestamp);
        const t = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
        const dl = fmt(e.downloadSpeed, 1);
        const ul = fmt(e.uploadSpeed, 1);
        const qClass = getQualityClass(e.downloadSpeed, e.uploadSpeed, e.ping);
        return `<div class="history-item">
            <span class="h-left"><span class="quality-dot ${qClass}"></span><span class="time">${t}</span></span>
            <span class="speeds"><span class="dl">${dl}</span><span class="ul">${ul}</span></span>
        </div>`;
    }).join('');
}
