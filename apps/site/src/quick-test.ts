/**
 * A short in-page check against the MeterX worker: a few pings and one download stream for about five seconds.
 * Nothing runs until the visitor asks.
 * @license AGPL-3.0
 */

import { WORKER_URL as WORKER } from '@meterx/shared';

async function pingMs(): Promise<number> {
    const t = performance.now();
    const r = await fetch(`${WORKER}/ping`, { cache: 'no-store' });
    await r.arrayBuffer();
    return performance.now() - t;
}

export async function quickTest(onSpeed: (mbps: number) => void): Promise<{ mbps: number; ping: number }> {
    await pingMs(); // warm the connection; the first request includes the TLS handshake
    const pings: number[] = [];
    for (let i = 0; i < 5; i++) pings.push(await pingMs());
    pings.sort((a, b) => a - b);
    const ping = pings[2];

    const ctrl = new AbortController();
    const stop = setTimeout(() => ctrl.abort(), 5500);
    const res = await fetch(`${WORKER}/test-file/25MB.bin`, { cache: 'no-store', signal: ctrl.signal });
    const reader = res.body!.getReader();
    const t0 = performance.now();
    const RAMP = 600; // skip slow start so the figure reflects the steady rate
    let bytes = 0, rampBytes = 0, mbps = 0, last = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            const t = performance.now() - t0;
            if (t < RAMP) { rampBytes = bytes; continue; }
            mbps = ((bytes - rampBytes) * 8) / ((t - RAMP) * 1000);
            if (t - last > 200) { onSpeed(mbps); last = t; }
        }
    } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    } finally {
        clearTimeout(stop);
    }
    // A fast line can finish inside the ramp window; then the whole transfer is the best estimate.
    if (!mbps && bytes) mbps = (bytes * 8) / ((performance.now() - t0) * 1000);
    return { mbps, ping };
}
