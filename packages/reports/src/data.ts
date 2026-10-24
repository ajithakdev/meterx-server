/**
 * CSV and JSON exports. One column list feeds both, so they always carry the same fields.
 * @license AGPL-3.0
 */

import { VERSION, gradeBufferbloat, localDate, qualityOf, type HistoryEntry } from '@meterx/shared';
import { summarize, type Spread } from './stats';

const round = (v: number | undefined, d: number) => (v === undefined || !Number.isFinite(v) ? undefined : Number(v.toFixed(d)));
const yesNo = (v: boolean | undefined) => (v === undefined ? undefined : v ? 'yes' : 'no');
const localTime = (ts: number) => {
    const d = new Date(ts);
    return `${localDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type Value = string | number | undefined;

/** Export columns: JSON key, CSV header, value. Units live in both names. */
export const COLUMNS: Array<{ key: string; header: string; get: (e: HistoryEntry) => Value }> = [
    { key: 'time', header: 'Time (UTC)', get: e => new Date(e.timestamp).toISOString() },
    { key: 'localTime', header: 'Local time', get: e => localTime(e.timestamp) },
    { key: 'downloadMbps', header: 'Download (Mbps)', get: e => round(e.downloadSpeed, 2) },
    { key: 'uploadMbps', header: 'Upload (Mbps)', get: e => round(e.uploadSpeed, 2) },
    { key: 'pingMs', header: 'Ping (ms)', get: e => round(e.ping, 1) },
    { key: 'jitterMs', header: 'Jitter (ms)', get: e => round(e.jitter, 1) },
    { key: 'packetLossPercent', header: 'Packet loss (%)', get: e => round(e.packetLoss, 1) },
    { key: 'pingWhileDownloadingMs', header: 'Ping while downloading (ms)', get: e => round(e.loadedPingDown, 1) },
    { key: 'pingWhileUploadingMs', header: 'Ping while uploading (ms)', get: e => round(e.loadedPingUp, 1) },
    { key: 'bufferbloatMs', header: 'Bufferbloat (ms)', get: e => round(e.bufferbloatDelta, 1) },
    { key: 'bufferbloatGrade', header: 'Bufferbloat grade', get: e => e.bufferbloatGrade ?? (e.bufferbloatDelta !== undefined ? gradeBufferbloat(e.bufferbloatDelta) : undefined) },
    { key: 'quality', header: 'Quality', get: e => qualityOf(e)?.label },
    { key: 'dnsLookupMs', header: 'DNS lookup (ms)', get: e => round(e.dnsLookupMs, 1) },
    { key: 'ipv4', header: 'IPv4', get: e => yesNo(e.ipv4Ok) },
    { key: 'ipv6', header: 'IPv6', get: e => yesNo(e.ipv6Ok) },
    { key: 'serverLocation', header: 'Server location', get: e => e.edge },
    { key: 'isp', header: 'ISP', get: e => e.isp },
];


/** Rows newest first, as stored. */
export function toCsv(history: HistoryEntry[]): string {
    const lines = [COLUMNS.map(c => escapeCsv(c.header)).join(',')];
    for (const e of history) lines.push(COLUMNS.map(c => escapeCsv(c.get(e))).join(','));
    return lines.join('\r\n') + '\r\n';
}

const typical = (s: Spread | null, k: 'avg' | 'median', d: number) => (s ? round(s[k], d) : undefined);

export function toJson(history: HistoryEntry[], now = Date.now()): object {
    const s = summarize(history);
    return {
        format: 'meterx-results',
        formatVersion: 1,
        app: { name: 'MeterX', version: VERSION },
        exportedAt: new Date(now).toISOString(),
        period: history.length ? { from: new Date(s.from).toISOString(), to: new Date(s.to).toISOString(), tests: s.count } : null,
        summary: {
            downloadMbpsAverage: typical(s.download, 'avg', 2),
            uploadMbpsAverage: typical(s.upload, 'avg', 2),
            pingMsMedian: typical(s.ping, 'median', 1),
            jitterMsMedian: typical(s.jitter, 'median', 1),
            packetLossPercentAverage: typical(s.loss, 'avg', 1),
            bufferbloatGrade: s.grade ?? undefined,
            quality: s.quality?.label,
            goodEnoughFor: s.useCases ?? undefined,
        },
        results: history.map(e => Object.fromEntries(COLUMNS.map(c => [c.key, c.get(e)]).filter(([, v]) => v !== undefined))),
    };
}

/** RFC 4180 quoting, plus a leading ' on text that a spreadsheet would run as a formula (#78). */
export function escapeCsv(v: unknown): string {
    if (v === null || v === undefined) return '';
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
