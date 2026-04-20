import { describe, it, expect } from 'vitest';
import { fmt, getTimeAgo } from './format';

describe('fmt', () => {
    it('formats a number with decimals', () => {
        expect(fmt(3.14159, 2)).toBe('3.14');
    });
    it('returns -- for undefined', () => {
        expect(fmt(undefined, 1)).toBe('--');
    });
    it('handles zero', () => {
        expect(fmt(0, 1)).toBe('0.0');
    });
});

describe('getTimeAgo', () => {
    it('says "just now" for recent', () => {
        expect(getTimeAgo(new Date(Date.now() - 5000))).toBe('just now');
    });
    it('formats minutes', () => {
        expect(getTimeAgo(new Date(Date.now() - 5 * 60 * 1000))).toBe('5m ago');
    });
    it('formats hours', () => {
        expect(getTimeAgo(new Date(Date.now() - 3 * 60 * 60 * 1000))).toBe('3h ago');
    });
    it('formats days', () => {
        expect(getTimeAgo(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))).toBe('2d ago');
    });
});
