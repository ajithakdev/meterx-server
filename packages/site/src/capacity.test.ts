import { describe, it, expect } from 'vitest';
import { capacity, formatDuration } from './capacity';

describe('capacity', () => {
    it('uses the extension thresholds and real arithmetic', () => {
        const c = capacity(100)!;
        expect(c.streams4k).toBe(4);
        expect(c.streamsHd).toBe(20);
        expect(c.gameSeconds).toBe(4000);
        expect(c.filmSeconds).toBe(320);
    });
    it('rejects nonsense', () => {
        expect(capacity(0)).toBeNull();
        expect(capacity(NaN)).toBeNull();
        expect(capacity(-5)).toBeNull();
    });
});

describe('formatDuration', () => {
    it('reads naturally', () => {
        expect(formatDuration(45)).toBe('45 seconds');
        expect(formatDuration(320)).toBe('5 minutes');
        expect(formatDuration(4000)).toBe('67 minutes');
        expect(formatDuration(6000)).toBe('1 hour 40 minutes');
        expect(formatDuration(1)).toBe('1 second');
        expect(formatDuration(7200)).toBe('2 hours');
    });
});
