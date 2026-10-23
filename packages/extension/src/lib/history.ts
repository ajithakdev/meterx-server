/**
 * Test history in chrome.storage.local (newest first). Written only by the service worker.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { HistoryEntry } from '@meterx/shared';

export const MAX_HISTORY = 200;

export async function loadHistory(limit = MAX_HISTORY): Promise<HistoryEntry[]> {
    const { history } = await chrome.storage.local.get('history');
    return (Array.isArray(history) ? history as HistoryEntry[] : []).slice(0, limit);
}

/** Prepends the entry and returns the previous newest entry. */
export async function saveHistory(entry: HistoryEntry): Promise<HistoryEntry | undefined> {
    const history = await loadHistory();
    const previous = history[0];
    history.unshift(entry);
    await chrome.storage.local.set({ history: history.slice(0, MAX_HISTORY) });
    return previous;
}

export async function clearHistory(): Promise<void> {
    await chrome.storage.local.remove('history');
}
