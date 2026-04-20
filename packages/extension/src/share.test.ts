import { describe, it, expect } from 'vitest';
import { buildShareUrl, parseShareUrl } from './share';

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
        };
        const url = buildShareUrl(entry);
        expect(url).toContain('#r=');
        const decoded = parseShareUrl(url);
        expect(decoded).not.toBeNull();
        expect(decoded!.timestamp).toBe(entry.timestamp);
        expect(decoded!.downloadSpeed).toBeCloseTo(123.5, 1);
        expect(decoded!.bufferbloatGrade).toBe('B');
        expect(decoded!.edge).toBe('BOM');
    });

    it('returns null for malformed URL', () => {
        expect(parseShareUrl('https://meterx.dev/share')).toBeNull();
        expect(parseShareUrl('https://meterx.dev/share#r=!!!')).toBeNull();
    });

    it('handles entries with missing fields', () => {
        const entry = { timestamp: 1_700_000_000_000 };
        const decoded = parseShareUrl(buildShareUrl(entry));
        expect(decoded!.timestamp).toBe(entry.timestamp);
        expect(decoded!.downloadSpeed).toBeUndefined();
    });
});
