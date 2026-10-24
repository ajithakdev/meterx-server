/**
 * Pure measurement math. No I/O, so it is unit tested (measure.test.ts).
 * @license AGPL-3.0
 */

import { gradeBufferbloat, median } from '@meterx/shared';

export { gradeBufferbloat, median };

/** Cumulative bytes received at time t (ms since the phase started). */
export interface ByteSample { t: number; bytes: number }

/** Decimal megabits per second, the unit ISPs advertise (#64). */
export function toMbps(bytes: number, ms: number): number {
    return ms > 0 ? (bytes * 8) / (ms * 1000) : 0;
}

/** Bytes at tTarget by linear interpolation between samples ordered by t. */
export function bytesAtTime(samples: ByteSample[], tTarget: number): number {
    if (samples.length === 0) return 0;
    if (tTarget <= samples[0].t) return samples[0].bytes;
    for (let i = 1; i < samples.length; i++) {
        const b = samples[i];
        if (b.t >= tTarget) {
            const a = samples[i - 1];
            return a.bytes + (b.bytes - a.bytes) * ((tTarget - a.t) / (b.t - a.t || 1));
        }
    }
    return samples[samples.length - 1].bytes;
}

/**
 * Steady-state throughput: drops the ramp-up and the tail, then measures
 * the bytes moved in the window between. Falls back to total/elapsed when
 * the phase ended too early for a window.
 */
export function steadyMbps(samples: ByteSample[], elapsedMs: number, opts: { rampMs: number; tailMs: number; durationMs: number }): number {
    const end = Math.min(opts.durationMs - opts.tailMs, elapsedMs);
    const last = samples.length ? samples[samples.length - 1].bytes : 0;
    if (end <= opts.rampMs) return toMbps(last, elapsedMs);
    return toMbps(bytesAtTime(samples, end) - bytesAtTime(samples, opts.rampMs), end - opts.rampMs);
}


/** Median ping, mean absolute change between consecutive pings, and % of probes lost. */
export function latencyStats(latencies: number[], attempts: number): { ping: number; jitter: number; packetLoss: number } {
    let diff = 0;
    for (let i = 1; i < latencies.length; i++) diff += Math.abs(latencies[i] - latencies[i - 1]);
    return {
        ping: median(latencies),
        jitter: latencies.length > 1 ? diff / (latencies.length - 1) : 0,
        packetLoss: attempts > 0 ? ((attempts - latencies.length) / attempts) * 100 : 0,
    };
}


const KB = 1024;
const MIN_UPLOAD_CHUNK = 256 * KB;
const MAX_UPLOAD_CHUNK = 8 * 1024 * KB;

/**
 * Upload body size so each stream finishes about 4 requests a second.
 * Bytes only count when a request completes, so fixed 5 MB bodies read
 * 0 Mbps on slow uplinks (#60). Sized from the download speed, which is
 * known by then and is usually the higher of the two.
 */
export function uploadChunkBytes(downloadMbps: number | undefined, streams: number): number {
    const perStreamBytesPerSec = ((downloadMbps || 0) * 1e6) / 8 / Math.max(1, streams);
    const target = Math.round(perStreamBytesPerSec / 4);
    return Math.min(MAX_UPLOAD_CHUNK, Math.max(MIN_UPLOAD_CHUNK, target));
}

/** Delay before retrying a failed transfer request: 250 ms, doubling, capped at 2 s (#65). */
export function backoffMs(failures: number): number {
    return Math.min(2000, 250 * 2 ** Math.max(0, failures - 1));
}
