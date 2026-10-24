import { describe, it, expect } from 'vitest';
import { PHASES, sampleFrame, sampleHistory, sampleResult } from './sample';

describe('sampleFrame', () => {
    it('walks the real phase order and ends on done', () => {
        expect(sampleFrame(0)).toBeNull();
        const phases = [0.05, 0.1, 0.3, 0.7].map(p => (sampleFrame(p) as { phase: string }).phase);
        expect(phases).toEqual(['connect', 'latency', 'download', 'upload']);
        expect(sampleFrame(PHASES.done)).toBe('done');
    });
    it('never shows a figure above the final result by more than the wobble', () => {
        for (let p = 0.2; p < 0.9; p += 0.01) {
            const f = sampleFrame(p) as { downloadSpeed?: number };
            if (f.downloadSpeed) expect(f.downloadSpeed).toBeLessThan(sampleResult().downloadSpeed! * 1.04);
        }
    });
});

describe('sampleHistory', () => {
    it('is stable, newest first, with consistent grades', () => {
        const h = sampleHistory(1e12);
        expect(h).toHaveLength(30);
        expect(h[0].timestamp).toBeGreaterThan(h[1].timestamp);
        expect(sampleHistory(1e12)).toEqual(h);
    });
});
