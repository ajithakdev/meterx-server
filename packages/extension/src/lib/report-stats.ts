/**
 * Pure stats for the PDF report, split out so the edge cases are tested.
 * @license AGPL-3.0
 */

const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

/** 0 to 100, higher is steadier. 100 for fewer than two results or an all-zero history. */
export function consistency(values: number[]): number {
    const m = avg(values);
    if (values.length < 2 || m === 0) return 100;
    const sd = Math.sqrt(avg(values.map(v => (v - m) ** 2)));
    return Math.max(0, Math.min(100, 100 - (sd / m) * 100));
}

/**
 * Percent change of the newer half against the older half (values are newest first).
 * Null when there is not enough data to compare (#76).
 */
export function trendPercent(newestFirst: number[]): number | null {
    if (newestFirst.length < 2) return null;
    const half = Math.floor(newestFirst.length / 2);
    const newer = avg(newestFirst.slice(0, half));
    const older = avg(newestFirst.slice(half));
    return older > 0 ? ((newer - older) / older) * 100 : null;
}
