/**
 * JSON + CSV export for machine-readable workflows.
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';

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
        version: '2026.0.319-MR1.0',
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
            edge: e.edge,
        })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `meterx-export-${new Date().toLocaleDateString('en-CA')}.json`);
}

export function exportCsv(history: HistoryEntry[]): void {
    const cols = ['timestamp', 'isoTime', 'downloadMbps', 'uploadMbps', 'pingMs', 'jitterMs', 'packetLossPct', 'bufferbloatDeltaMs', 'bufferbloatGrade', 'dnsLookupMs', 'ipv4Ok', 'ipv6Ok', 'edge'];
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
    ]);
    const csv = [cols.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    triggerDownload(blob, `meterx-export-${new Date().toLocaleDateString('en-CA')}.csv`);
}

function escapeCsv(v: unknown): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}
