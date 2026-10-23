import { describe, it, expect } from 'vitest';
import { consistency, trendPercent } from './report-stats';

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
