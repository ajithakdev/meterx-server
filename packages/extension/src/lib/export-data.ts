/**
 * JSON + CSV export for machine-readable workflows.
 * @license AGPL-3.0
 */

import { VERSION, type HistoryEntry } from '@meterx/shared';

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportJson(history: HistoryEntry[]): void {
    const payload = {
        exportedAt: new Date().toISOString(),
        tool: 'MeterX',
        version: VERSION,
        count: history.length,
        results: history.map(e => ({
            timestamp: e.timestamp,
            isoTime: new Date(e.timestamp).toISOString(),
            downloadMbps: e.downloadSpeed,
            uploadMbps: e.uploadSpeed,
            pingMs: e.ping,
            jitterMs: e.jitter,
            packetLossPct: e.packetLoss,
            bufferbloatDeltaMs: e.bufferbloatDelta,
            bufferbloatGrade: e.bufferbloatGrade,
            dnsLookupMs: e.dnsLookupMs,
            ipv4Ok: e.ipv4Ok,
            ipv6Ok: e.ipv6Ok,
            loadedPingDownMs: e.loadedPingDown,
            loadedPingUpMs: e.loadedPingUp,
            edge: e.edge,
            isp: e.isp,
        })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `meterx-export-${new Date().toLocaleDateString('en-CA')}.json`);
}

export function exportCsv(history: HistoryEntry[]): void {
    const cols = ['timestamp', 'isoTime', 'downloadMbps', 'uploadMbps', 'pingMs', 'jitterMs', 'packetLossPct', 'bufferbloatDeltaMs', 'bufferbloatGrade', 'dnsLookupMs', 'ipv4Ok', 'ipv6Ok', 'edge', 'isp'];
    const rows = history.map(e => [
        e.timestamp,
        new Date(e.timestamp).toISOString(),
        e.downloadSpeed ?? '',
        e.uploadSpeed ?? '',
        e.ping ?? '',
        e.jitter ?? '',
        e.packetLoss ?? '',
        e.bufferbloatDelta ?? '',
        e.bufferbloatGrade ?? '',
        e.dnsLookupMs ?? '',
        e.ipv4Ok ?? '',
        e.ipv6Ok ?? '',
        e.edge ?? '',
        e.isp ?? '',
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, `meterx-export-${new Date().toLocaleDateString('en-CA')}.csv`);
}

/** RFC 4180 quoting, plus a leading ' on text that a spreadsheet would run as a formula (#78). */
export function escapeCsv(v: unknown): string {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
