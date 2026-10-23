import { describe, it, expect } from 'vitest';
import { fmt, fmtSpeed, fmtWhen, getTimeAgo } from './format';

describe('fmt', () => {
    it('formats a number with decimals', () => {
        expect(fmt(3.14159, 2)).toBe('3.14');
    });
    it('returns an em dash for missing or NaN', () => {
        expect(fmt(undefined, 1)).toBe('-');
        expect(fmt(NaN, 1)).toBe('-');
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

describe('fmtSpeed', () => {
    it('drops decimals at 100 Mbps and above', () => {
        expect(fmtSpeed(84.26)).toBe('84.3');
        expect(fmtSpeed(512.7)).toBe('513');
    });
});

describe('fmtWhen', () => {
    it('names today and yesterday', () => {
        const now = new Date(2026, 9, 22, 15, 0).getTime();
        expect(fmtWhen(new Date(2026, 9, 22, 9, 5).getTime(), now)).toMatch(/^Today /);
        expect(fmtWhen(new Date(2026, 9, 21, 23, 59).getTime(), now)).toMatch(/^Yesterday /);
        expect(fmtWhen(new Date(2026, 9, 3, 18, 40).getTime(), now)).not.toMatch(/^(Today|Yesterday)/);
    });
});
