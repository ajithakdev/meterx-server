import { describe, it, expect } from 'vitest';
import { escapeCsv } from './data';

describe('escapeCsv', () => {
    it('leaves numbers and plain text alone', () => {
        expect(escapeCsv(12.5)).toBe('12.5');
        expect(escapeCsv(-3)).toBe('-3');
        expect(escapeCsv('BOM')).toBe('BOM');
        expect(escapeCsv(undefined)).toBe('');
    });
    it('quotes commas, quotes and both line endings', () => {
        expect(escapeCsv('a,b')).toBe('"a,b"');
        expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsv('a\rb')).toBe('"a\rb"');
    });
    it('defuses formula-leading text (#78)', () => {
        expect(escapeCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
        expect(escapeCsv('@SUM(A1)')).toBe("'@SUM(A1)");
    });
});

import type { HistoryEntry } from '@meterx/shared';
import { COLUMNS, toCsv, toJson } from './data';

const entry: HistoryEntry = {
    timestamp: Date.UTC(2026, 9, 24, 8, 30), downloadSpeed: 96.0381, uploadSpeed: 56.31, ping: 202.64, jitter: 13.2,
    packetLoss: 0, bufferbloatDelta: 94.4, loadedPingDown: 297, loadedPingUp: 186, ipv4Ok: true, ipv6Ok: false, edge: 'MAA',
};

describe('toCsv', () => {
    it('has a header with units and one rounded row per result', () => {
        const [head, row, end] = toCsv([entry]).split('\r\n');
        expect(head.split(',')).toEqual(COLUMNS.map(c => c.header));
        expect(head).toContain('Download (Mbps)');
        expect(row).toContain('2026-10-24T08:30:00.000Z');
        expect(row).toContain(',96.04,56.31,202.6,13.2,0,');
        expect(row).toContain(',yes,no,MAA,');
        expect(end).toBe('');
    });
});

describe('toJson', () => {
    it('carries a versioned format, a summary and the same fields as the CSV', () => {
        const j = toJson([entry, { ...entry, timestamp: entry.timestamp - 3_600_000, downloadSpeed: 50 }], entry.timestamp) as {
            format: string; formatVersion: number; period: { tests: number }; summary: Record<string, unknown>; results: Array<Record<string, unknown>>;
        };
        expect(j.format).toBe('meterx-results');
        expect(j.formatVersion).toBe(1);
        expect(j.period.tests).toBe(2);
        expect(j.summary.downloadMbpsAverage).toBe(73.02);
        expect(j.summary.quality).toBe('Poor');
        expect(j.results[0]).toMatchObject({ downloadMbps: 96.04, ipv4: 'yes', bufferbloatGrade: 'D' });
        expect(j.results[0]).not.toHaveProperty('isp');
    });
});
