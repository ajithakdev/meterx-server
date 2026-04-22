import { describe, it, expect } from 'vitest';
import { getQuality, getQualityClass, scoreUseCases } from './quality';

describe('getQuality', () => {
    it('grades excellent for 100/50/10ms', () => {
        expect(getQuality(100, 50, 10).cls).toBe('excellent');
    });
    it('grades good for 25/15/40ms', () => {
        expect(getQuality(25, 15, 40).cls).toBe('good');
    });
    it('grades fair for 10/5/100ms', () => {
        expect(getQuality(10, 5, 100).cls).toBe('fair');
    });
    it('grades poor for 1/0.5/300ms', () => {
        expect(getQuality(1, 0.5, 300).cls).toBe('poor');
    });
    it('downgrades if ping is bad even with great speed', () => {
        expect(getQuality(500, 200, 500).cls).toBe('poor');
    });
});

describe('getQualityClass', () => {
    it('returns q-fair for undefined inputs', () => {
        expect(getQualityClass(undefined, undefined, undefined)).toBe('q-fair');
    });
    it('prefixes q-', () => {
        expect(getQualityClass(100, 50, 10)).toBe('q-excellent');
    });
});

describe('scoreUseCases', () => {
    it('scores gaming poor when loss is high', () => {
        const s = scoreUseCases(100, 50, 10, 2, 5);
        expect(s.gaming).toBe('poor');
    });
    it('scores gaming good on clean 30ms ping', () => {
        const s = scoreUseCases(100, 50, 30, 5, 0);
        expect(s.gaming).toBe('good');
    });
    it('scores streaming good at 50 Mbps down', () => {
        expect(scoreUseCases(50, 5, 40).stream).toBe('good');
    });
    it('treats missing jitter as very bad', () => {
        expect(scoreUseCases(100, 50, 10).calls).not.toBe('good');
    });
});
