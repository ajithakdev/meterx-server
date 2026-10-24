/**
 * Sample data for the demo pages: a week of results on a 300/100 plan and one test played frame by frame.
 * Everything here is labelled as sample data wherever it is shown.
 * @license AGPL-3.0
 */

import { gradeBufferbloat, type HistoryEntry, type IspPlan, type TestProgress } from '@meterx/shared';

export const SAMPLE_PLAN: IspPlan = { downloadMbps: 300, uploadMbps: 100, providerName: 'Sample ISP' };

/** Thirty results, newest first, one every 5.6 hours, with one slow evening. Deterministic. */
export function sampleHistory(now = Date.now()): HistoryEntry[] {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    return Array.from({ length: 30 }, (_, i) => {
        const ping = 18 + rnd() * 8;
        const delta = 30 + rnd() * 20;
        return {
            timestamp: now - (i + 1) * 5.6 * 3600e3,
            downloadSpeed: 262 + rnd() * 40 - (i === 9 ? 120 : 0),
            uploadSpeed: 88 + rnd() * 10,
            ping, jitter: 1.5 + rnd() * 2.5, packetLoss: 0,
            bufferbloatDelta: delta, bufferbloatGrade: gradeBufferbloat(delta),
            loadedPingDown: ping + delta, loadedPingUp: ping + delta * 0.6,
            ipv4Ok: true, ipv6Ok: true, edge: 'MAA', isp: 'Sample ISP',
        };
    });
}

const FINAL = { downloadSpeed: 284.6, uploadSpeed: 92.1, ping: 19, jitter: 2.1, packetLoss: 0, loadedPingDown: 61, loadedPingUp: 46 };

/** The result the sample test ends on. */
export function sampleResult(now = Date.now()): HistoryEntry {
    const delta = Math.max(FINAL.loadedPingDown, FINAL.loadedPingUp) - FINAL.ping;
    return { ...FINAL, timestamp: now, bufferbloatDelta: delta, bufferbloatGrade: gradeBufferbloat(delta), ipv4Ok: true, ipv6Ok: true, edge: 'MAA', isp: 'Sample ISP' };
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const rise = (t: number) => 1 - Math.exp(-5 * t);
const wobble = (t: number) => 1 + 0.03 * Math.sin(t * 37);

/** Phase boundaries as shares of the whole test, matching the real timings (about 1 s, 2 s, 9 s, 9 s). */
export const PHASES = { start: 0.04, latency: 0.08, download: 0.2, upload: 0.56, done: 0.9 } as const;

/**
 * The sample test at position p (0 to 1): null before it starts, 'done' once it has finished,
 * otherwise the progress message the real service worker would send at that moment.
 */
export function sampleFrame(p: number): TestProgress | null | 'done' {
    if (p < PHASES.start) return null;
    if (p >= PHASES.done) return 'done';
    if (p < PHASES.latency) return { phase: 'connect', status: 'Connecting' };
    const lt = clamp((p - PHASES.latency) / (PHASES.download - PHASES.latency));
    const ping = FINAL.ping + 9 * (1 - lt), jitter = FINAL.jitter + 1.5 * (1 - lt);
    if (p < PHASES.download) return { phase: 'latency', status: 'Measuring ping', ping, jitter, packetLoss: 0 };
    const dt = clamp((p - PHASES.download) / (PHASES.upload - PHASES.download));
    const down = FINAL.downloadSpeed * rise(dt) * wobble(dt);
    if (p < PHASES.upload) return { phase: 'download', status: 'Measuring download', ping, jitter, packetLoss: 0, downloadSpeed: down };
    const ut = clamp((p - PHASES.upload) / (PHASES.done - PHASES.upload));
    return { phase: 'upload', status: 'Measuring upload', ping, jitter, packetLoss: 0, downloadSpeed: FINAL.downloadSpeed, uploadSpeed: FINAL.uploadSpeed * rise(ut) * wobble(ut) };
}
