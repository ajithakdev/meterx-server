/**
 * One speed test: connect, idle latency, download, upload.
 * Runs in the service worker. The math is in measure.ts.
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { IpInfo, TestProgress, TestResults } from '@meterx/shared';
import {
    type ByteSample, backoffMs, bytesAtTime, gradeBufferbloat, latencyStats,
    median, steadyMbps, toMbps, uploadChunkBytes,
} from './measure';

const DOWNLOAD_PATH = '/test-file/25MB.bin';
const DOWNLOAD_STREAMS = 4;
const UPLOAD_STREAMS = 3;
// Multi-stream, fixed-duration phases (the M-Lab / Ookla approach).
// The worker and Express rate limits are sized for this burst; raise them if you add streams.
const MEASURE_DURATION_MS = 8000;
const WINDOW = { rampMs: 1200, tailMs: 500, durationMs: MEASURE_DURATION_MS };
const PING_COUNT = 10;
const PING_GAP_MS = 100;
const PING_TIMEOUT_MS = 3000;
const LOADED_PING_INTERVAL_MS = 400;
const PROGRESS_EVERY_MS = 200;

export type Reporter = (progress: TestProgress) => void;

export class CancelledError extends Error {
    constructor() { super('Test cancelled'); this.name = 'CancelledError'; }
}

export class HttpError extends Error {
    constructor(readonly status: number) { super(`Server answered HTTP ${status}`); this.name = 'HttpError'; }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
        if (signal.aborted) return resolve();
        const done = () => { clearTimeout(t); signal.removeEventListener('abort', done); resolve(); };
        const t = setTimeout(done, ms);
        signal.addEventListener('abort', done, { once: true });
    });
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number, signal: AbortSignal): Promise<Response> {
    return fetch(url, { cache: 'no-store', ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(ms)]) });
}

const bust = (url: string, tag: string) => `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}_${tag}`;

/** Fires HEAD /ping on an interval while a transfer runs; the median rise over idle is bufferbloat. */
function startLoadedProbe(baseUrl: string, signal: AbortSignal): () => Promise<number | undefined> {
    const samples: number[] = [];
    const stop = new AbortController();
    const both = AbortSignal.any([signal, stop.signal]);
    const loop = (async () => {
        while (!both.aborted) {
            const t0 = performance.now();
            try {
                const res = await fetchWithTimeout(bust(`${baseUrl}/ping`, 'load'), { method: 'HEAD' }, PING_TIMEOUT_MS, both);
                if (res.ok) samples.push(performance.now() - t0);
            } catch { /* a lost probe only lowers the sample count */ }
            await sleep(LOADED_PING_INTERVAL_MS, both);
        }
    })();
    return async () => { stop.abort(); await loop; return samples.length ? median(samples) : undefined; };
}

/**
 * Runs `streams` parallel request loops for MEASURE_DURATION_MS and returns steady-state Mbps.
 * `one` performs a single request and calls `credit(bytes)` as bytes move.
 */
async function runStreams(
    signal: AbortSignal,
    streams: number,
    one: (signal: AbortSignal, credit: (bytes: number) => void) => Promise<void>,
    onLive: (mbps: number) => void,
): Promise<number> {
    const phase = new AbortController();
    const both = AbortSignal.any([signal, phase.signal]);
    const timer = setTimeout(() => phase.abort(), MEASURE_DURATION_MS);
    const start = performance.now();
    const samples: ByteSample[] = [{ t: 0, bytes: 0 }];
    let total = 0;
    let lastLive = 0;
    let lastError: unknown;

    const credit = (bytes: number) => {
        if (both.aborted) return;
        total += bytes;
        const t = performance.now() - start;
        samples.push({ t, bytes: total });
        if (t - lastLive >= PROGRESS_EVERY_MS && t > 500) {
            lastLive = t;
            const span = Math.min(1000, t);
            onLive(toMbps(total - bytesAtTime(samples, t - span), span));
        }
    };

    const loop = async () => {
        let failures = 0;
        while (!both.aborted) {
            try {
                await one(both, credit);
                failures = 0;
            } catch (e) {
                if (both.aborted) break;
                lastError = e;
                await sleep(backoffMs(++failures), both);
            }
        }
    };

    try {
        await Promise.all(Array.from({ length: streams }, loop));
    } finally {
        clearTimeout(timer);
    }
    if (signal.aborted) throw new CancelledError();
    if (total === 0) throw lastError instanceof Error ? lastError : new Error('No data reached the server');
    return steadyMbps(samples, Math.min(performance.now() - start, MEASURE_DURATION_MS), WINDOW);
}

async function measureLatency(baseUrl: string, signal: AbortSignal, report: Reporter) {
    const latencies: number[] = [];
    for (let i = 0; i < PING_COUNT; i++) {
        if (signal.aborted) throw new CancelledError();
        const t0 = performance.now();
        try {
            const res = await fetchWithTimeout(bust(`${baseUrl}/ping`, `p${i}`), { method: 'HEAD' }, PING_TIMEOUT_MS, signal);
            if (res.ok) {
                latencies.push(performance.now() - t0);
                report({ phase: 'latency', ping: median(latencies) });
            }
        } catch { if (signal.aborted) throw new CancelledError(); }
        await sleep(PING_GAP_MS, signal);
    }
    if (signal.aborted) throw new CancelledError();
    if (latencies.length === 0) throw new Error(`All ${PING_COUNT} pings failed`);
    return latencyStats(latencies, PING_COUNT);
}

/** First request of the test: warms the connection, reads DNS time and server-side connection facts. */
async function connect(baseUrl: string, signal: AbortSignal): Promise<{ info?: IpInfo; dnsMs?: number }> {
    performance.clearResourceTimings(); // DNS must come from this test, not an earlier one (#69)
    const url = bust(`${baseUrl}/ip`, 'connect');
    let info: IpInfo | undefined;
    try {
        const res = await fetchWithTimeout(url, {}, 8000, signal);
        if (res.status === 429) throw new HttpError(429);
        if (res.ok) info = await res.json() as IpInfo;
    } catch (e) {
        if (signal.aborted) throw new CancelledError();
        if (e instanceof HttpError) throw e;
        // Older self-hosted servers have no /ip; /ping decides whether the server is reachable at all.
        const ping = await fetchWithTimeout(bust(`${baseUrl}/ping`, 'connect'), { method: 'HEAD' }, 8000, signal);
        if (!ping.ok) throw new HttpError(ping.status);
    }
    const entry = performance.getEntriesByName(url).at(-1) as PerformanceResourceTiming | undefined;
    const dns = entry ? entry.domainLookupEnd - entry.domainLookupStart : 0;
    return { info, dnsMs: dns > 0 ? dns : undefined };
}

export async function runTest(baseUrl: string, signal: AbortSignal, report: Reporter): Promise<TestResults> {
    report({ phase: 'connect', status: 'Connecting' });
    const { info, dnsMs } = await connect(baseUrl, signal);
    const results: TestResults = {
        serverUrl: baseUrl,
        dnsLookupMs: dnsMs,
        edge: info?.edge,
        isp: info?.isp,
        ipv4Ok: info?.family === 'ipv4' || undefined,
        ipv6Ok: info?.family === 'ipv6' || undefined,
    };

    report({ phase: 'latency', status: 'Measuring latency' });
    Object.assign(results, await measureLatency(baseUrl, signal, report));
    report({ phase: 'latency', ping: results.ping, jitter: results.jitter, packetLoss: results.packetLoss });

    report({ phase: 'download', status: 'Testing download' });
    let stopProbe = startLoadedProbe(baseUrl, signal);
    try {
        results.downloadSpeed = await runStreams(signal, DOWNLOAD_STREAMS, async (s, credit) => {
            const res = await fetch(bust(`${baseUrl}${DOWNLOAD_PATH}`, 'd'), { cache: 'no-store', signal: s });
            if (!res.ok || !res.body) throw new HttpError(res.status);
            const reader = res.body.getReader();
            for (;;) {
                const { done, value } = await reader.read();
                if (done) return;
                credit(value.byteLength);
            }
        }, mbps => report({ phase: 'download', downloadSpeed: mbps }));
    } finally {
        results.loadedPingDown = await stopProbe();
    }
    report({ phase: 'download', downloadSpeed: results.downloadSpeed });

    report({ phase: 'upload', status: 'Testing upload' });
    const payload = new Uint8Array(uploadChunkBytes(results.downloadSpeed, UPLOAD_STREAMS));
    stopProbe = startLoadedProbe(baseUrl, signal);
    try {
        results.uploadSpeed = await runStreams(signal, UPLOAD_STREAMS, async (s, credit) => {
            const res = await fetch(bust(`${baseUrl}/upload`, 'u'), {
                method: 'POST', cache: 'no-store', signal: s,
                headers: { 'Content-Type': 'application/octet-stream' }, body: payload,
            });
            if (!res.ok) throw new HttpError(res.status);
            await res.arrayBuffer();
            // fetch() has no upload progress, so bytes count when each body completes.
            credit(payload.byteLength);
        }, mbps => report({ phase: 'upload', uploadSpeed: mbps }));
    } finally {
        results.loadedPingUp = await stopProbe();
    }

    const loaded = Math.max(results.loadedPingDown ?? -Infinity, results.loadedPingUp ?? -Infinity);
    if (Number.isFinite(loaded) && results.ping !== undefined) {
        results.bufferbloatDelta = Math.max(0, loaded - results.ping);
        results.bufferbloatGrade = gradeBufferbloat(results.bufferbloatDelta);
    }
    report({ phase: 'done', uploadSpeed: results.uploadSpeed });
    return results;
}
