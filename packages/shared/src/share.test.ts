import { describe, it, expect } from 'vitest';
import { buildShareUrl, parseShareUrl, SHARE_VIEWER } from './share';

describe('share URL round-trip', () => {
    it('encodes and decodes a full result', () => {
        const entry = {
            timestamp: 1_700_000_000_000,
            downloadSpeed: 123.456,
            uploadSpeed: 42.8,
            ping: 18.3,
            jitter: 2.1,
            packetLoss: 0,
            bufferbloatGrade: 'B' as const,
            edge: 'BOM',
            isp: 'Reliance Jio',
        };
        const url = buildShareUrl(entry);
        expect(url).toContain('#r=');
        const decoded = parseShareUrl(url);
        expect(decoded).not.toBeNull();
        expect(decoded!.timestamp).toBe(entry.timestamp);
        expect(decoded!.downloadSpeed).toBeCloseTo(123.5, 1);
        expect(decoded!.bufferbloatGrade).toBe('B');
        expect(decoded!.edge).toBe('BOM');
        expect(decoded!.isp).toBe('Reliance Jio');
        expect(url.startsWith(SHARE_VIEWER)).toBe(true);
    });

    it('drops fields that fail validation', () => {
        const evil = { t: 1, dl: 'x', ul: -5, p: 1e9, bb: 'Z', e: '<script>', i: '<img onerror=1>' };
        const b64 = btoa(JSON.stringify(evil)).replace(/=+$/, '');
        const decoded = parseShareUrl(`${SHARE_VIEWER}#r=${b64}`);
        expect(decoded).toEqual({ timestamp: 1, downloadSpeed: undefined, uploadSpeed: undefined, ping: undefined, jitter: undefined, packetLoss: undefined, bufferbloatGrade: undefined, edge: undefined, isp: undefined });
    });

    it('returns null for malformed URL', () => {
        expect(parseShareUrl('https://meterx.ajithakdev.com/r/')).toBeNull();
        expect(parseShareUrl('https://meterx.ajithakdev.com/r/#r=!!!')).toBeNull();
    });

    it('handles entries with missing fields', () => {
        const entry = { timestamp: 1_700_000_000_000 };
        const decoded = parseShareUrl(buildShareUrl(entry));
        expect(decoded!.timestamp).toBe(entry.timestamp);
        expect(decoded!.downloadSpeed).toBeUndefined();
    });
});
