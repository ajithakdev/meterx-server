/**
 * CSV and JSON downloads. The files themselves are built by @meterx/reports.
 * @license AGPL-3.0
 */

import { localDate, type HistoryEntry } from '@meterx/shared';
import { toCsv, toJson } from '@meterx/reports';

export function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportCsv(history: HistoryEntry[]): void {
    // The BOM makes Excel read the file as UTF-8.
    triggerDownload(new Blob(['\uFEFF', toCsv(history)], { type: 'text/csv;charset=utf-8' }), `meterx-results-${localDate()}.csv`);
}

export function exportJson(history: HistoryEntry[]): void {
    triggerDownload(new Blob([JSON.stringify(toJson(history), null, 2)], { type: 'application/json' }), `meterx-results-${localDate()}.json`);
}
