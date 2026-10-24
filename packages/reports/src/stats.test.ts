import { describe, it, expect } from 'vitest';
import { consistency, trendPercent } from './stats';

describe('trendPercent', () => {
    it('has no trend for one result (#76)', () => {
        expect(trendPercent([50])).toBeNull();
        expect(trendPercent([])).toBeNull();
    });
    it('compares the newer half with the older half', () => {
        expect(trendPercent([120, 100])).toBe(20);
        expect(trendPercent([80, 80, 100, 100])).toBe(-20);
    });
    it('is null when the older half is all zero', () => {
        expect(trendPercent([10, 0])).toBeNull();
    });
});

describe('consistency', () => {
    it('never returns NaN for zeros', () => {
        expect(consistency([0, 0, 0])).toBe(100);
    });
    it('is 100 for identical values and lower for spread', () => {
        expect(consistency([50, 50])).toBe(100);
        expect(consistency([10, 90])).toBeLessThan(50);
    });
});

import { summarize } from './stats';

describe('summarize', () => {
    it('is empty-safe', () => {
        const s = summarize([]);
        expect(s.count).toBe(0);
        expect(s.download).toBeNull();
        expect(s.quality).toBeNull();
        expect(s.trend).toBeNull();
    });
    it('averages speeds, takes medians of delays and skips missing values', () => {
        const s = summarize([
            { timestamp: 3, downloadSpeed: 100, uploadSpeed: 20, ping: 10, bufferbloatDelta: 10 },
            { timestamp: 2, downloadSpeed: 50, uploadSpeed: 10, ping: 30 },
            { timestamp: 1, ping: 1000 },
        ]);
        expect(s.download).toMatchObject({ avg: 75, min: 50, max: 100, n: 2 });
        expect(s.ping?.median).toBe(30);
        expect(s.grade).toBe('B');
        expect(s.from).toBe(1);
        expect(s.to).toBe(3);
        expect(s.quality?.label).toBe('Good');
    });
});
