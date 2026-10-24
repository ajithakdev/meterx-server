import { describe, it, expect } from 'vitest';
import type { HistoryEntry } from '@meterx/shared';
import { buildReport, niceMax } from './pdf';

const rows = (n: number): HistoryEntry[] => Array.from({ length: n }, (_, i) => ({
    timestamp: Date.UTC(2026, 9, 24) - i * 3_600_000, downloadSpeed: 90 + i, uploadSpeed: 50, ping: 20, jitter: 2, packetLoss: 0,
    bufferbloatDelta: 30, bufferbloatGrade: 'B', loadedPingDown: 50, loadedPingUp: 40,
}));

describe('buildReport', () => {
    it('fits a short history on one page with selectable text', async () => {
        const doc = await buildReport(rows(3), null);
        expect(doc.getNumberOfPages()).toBe(1);
        const out = doc.output();
        expect(out).toContain('Connection report');
        expect(out).toContain('Page 1 of 1');
    });
    it('continues the results table on new pages', async () => {
        const doc = await buildReport(rows(200), { downloadMbps: 100, uploadMbps: 50 });
        expect(doc.getNumberOfPages()).toBeGreaterThan(2);
        expect(doc.output()).toContain('Results \\(continued\\)');
    });
});

describe('niceMax', () => {
    it('rounds up to a readable axis top', () => {
        expect(niceMax(96)).toBe(100);
        expect(niceMax(108)).toBe(120);
        expect(niceMax(1234)).toBe(1600);
        expect(niceMax(220)).toBe(240);
        expect(niceMax(0)).toBe(10);
    });
});

import { reportId } from './pdf';

describe('reportId', () => {
    it('is stable for the same results and changes when any figure changes', async () => {
        const a = await reportId(rows(3));
        expect(a).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
        expect(await reportId(rows(3))).toBe(a);
        const edited = rows(3); edited[1].downloadSpeed = 500;
        expect(await reportId(edited)).not.toBe(a);
    });
});
