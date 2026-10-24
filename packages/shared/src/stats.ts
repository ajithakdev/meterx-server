/**
 * Pure measurement helpers shared by the extension, the reports and the site.
 * @license AGPL-3.0
 */

import type { Grade } from './index';

export function median(values: number[]): number {
    if (values.length === 0) return NaN;
    const s = [...values].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** How much latency rises under load. Thresholds follow the Waveform bufferbloat test. */
export function gradeBufferbloat(deltaMs: number): Grade {
    if (deltaMs <= 5) return 'A';
    if (deltaMs <= 30) return 'B';
    if (deltaMs <= 60) return 'C';
    if (deltaMs <= 200) return 'D';
    return 'F';
}

/** Share of the plan delivered, or null when that side of the plan was left blank (#70). */
export function planShare(measured: number | undefined, planned: number): number | null {
    return measured === undefined || !(planned > 0) ? null : (measured / planned) * 100;
}
