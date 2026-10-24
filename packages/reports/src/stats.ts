/**
 * Pure stats for the exports (PDF report and JSON summary), split out so the edge cases are tested.
 * @license AGPL-3.0
 */

import { getQuality, gradeBufferbloat, median, scoreUseCases, type Grade, type HistoryEntry, type QualityLabel, type UseCaseScores } from '@meterx/shared';

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

export interface Spread { avg: number; median: number; min: number; max: number; n: number }

function spread(values: Array<number | undefined>): Spread | null {
    const v = values.filter((x): x is number => x !== undefined && Number.isFinite(x));
    return v.length ? { avg: avg(v), median: median(v), min: Math.min(...v), max: Math.max(...v), n: v.length } : null;
}

export interface Summary {
    count: number;
    from: number;
    to: number;
    download: Spread | null;
    upload: Spread | null;
    ping: Spread | null;
    jitter: Spread | null;
    loss: Spread | null;
    loadedPingDown: Spread | null;
    loadedPingUp: Spread | null;
    /** Bufferbloat grade of the median loaded-minus-idle delay. */
    grade: Grade | null;
    quality: QualityLabel | null;
    useCases: UseCaseScores | null;
    /** Download steadiness, 0 to 100. */
    steadiness: number;
    /** Download change, newer half vs older half, in percent. */
    trend: number | null;
}

/** Summary of a history (newest first, as stored). Typical values use the average for speeds and the median for delays. */
export function summarize(hist: HistoryEntry[]): Summary {
    const s = (k: keyof HistoryEntry) => spread(hist.map(e => e[k] as number | undefined));
    const download = s('downloadSpeed'), upload = s('uploadSpeed'), ping = s('ping');
    const jitter = s('jitter'), loss = s('packetLoss');
    const delta = spread(hist.map(e => e.bufferbloatDelta));
    const times = hist.map(e => e.timestamp);
    const ready = download && upload && ping;
    return {
        count: hist.length,
        from: times.length ? Math.min(...times) : 0,
        to: times.length ? Math.max(...times) : 0,
        download, upload, ping, jitter, loss,
        loadedPingDown: s('loadedPingDown'),
        loadedPingUp: s('loadedPingUp'),
        grade: delta ? gradeBufferbloat(delta.median) : null,
        quality: ready ? getQuality(download.avg, upload.avg, ping.median) : null,
        useCases: ready ? scoreUseCases(download.avg, upload.avg, ping.median, jitter?.median, loss?.avg) : null,
        steadiness: consistency(hist.map(e => e.downloadSpeed).filter((v): v is number => v !== undefined)),
        trend: trendPercent(hist.map(e => e.downloadSpeed).filter((v): v is number => v !== undefined)),
    };
}
