/**
 * MeterX Background Service Worker
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 * @version 2026.0.319-MR1.0
 */

/// <reference types="chrome" />

import type { TestProgress, TestResults, PingResult } from '@meterx/shared';

// --- Configuration ---
const DEFAULT_SERVER_URL = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';
const DOWNLOAD_CHUNK_MB = 25; // biggest allowed chunk per stream (server whitelist max)
const DOWNLOAD_CHUNK_PATH = `/test-file/${DOWNLOAD_CHUNK_MB}MB.bin`;
const UPLOAD_CHUNK_MB = 5; // body size per POST stream
const UPLOAD_ENDPOINT_PATH = '/upload';
const PING_ENDPOINT_PATH = '/ping';
const PING_COUNT = 5;
// Multi-stream duration-based measurement — matches M-Lab / Ookla approach.
// 4 parallel streams let us saturate typical home links up to ~gigabit.
const PARALLEL_DOWNLOAD_STREAMS = 4;
const PARALLEL_UPLOAD_STREAMS = 3;
const MEASURE_DURATION_MS = 8000;
const RAMP_UP_TRIM_MS = 1200; // drop first 1.2s while TCP ramps up
const TAIL_TRIM_MS = 500;      // drop last 0.5s to avoid partial chunk skew
const FETCH_PING_TIMEOUT = 5000;
const LOADED_PING_INTERVAL_MS = 300; // probe ping every 300ms during load
const SCHEDULE_ALARM_NAME = 'meterx-scheduled-test';
const QUALITY_DROP_NOTIFICATION_ID = 'meterx-quality-drop';

// --- Server URL (configurable via options page) ---
async function getServerUrl(): Promise<string> {
    try {
        const result = await chrome.storage.sync.get('serverUrl');
        return result.serverUrl || DEFAULT_SERVER_URL;
    } catch {
        return DEFAULT_SERVER_URL;
    }
}

// --- Bufferbloat grading ---
function gradeBufferbloat(deltaMs: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (deltaMs <= 5) return 'A';
    if (deltaMs <= 30) return 'B';
    if (deltaMs <= 60) return 'C';
    if (deltaMs <= 200) return 'D';
    return 'F';
}

// --- Messaging Helpers ---
function cleanData(data: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

async function sendProgress(data: TestProgress): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: "testProgress", data: cleanData(data as unknown as Record<string, unknown>) });
    } catch { /* Popup might be closed */ }
}

async function sendCompletion(data: TestResults): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: "testComplete", data: cleanData(data as unknown as Record<string, unknown>) });
    } catch { /* Popup might be closed */ }
}

async function sendError(errorMessage: string): Promise<void> {
    try {
        await chrome.runtime.sendMessage({ action: "testError", error: errorMessage });
    } catch { /* Popup might be closed */ }
}

// --- Fetch with Timeout ---
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error: unknown) {
        clearTimeout(id);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout / 1000}s`);
        }
        throw error;
    }
}

// --- Test Functions ---

// Loaded-ping probe: fires HEAD /ping on an interval while a flag is live.
// Returns array of observed latencies in ms. Never throws — individual probe
// failures are silently skipped because we only care about aggregate delay.
interface LoadedPingHandle {
    stop: () => Promise<number[]>;
}

function startLoadedPingProbe(baseUrl: string): LoadedPingHandle {
    const samples: number[] = [];
    let stopped = false;
    let wakeSleep: (() => void) | null = null;

    async function loop(): Promise<void> {
        while (!stopped) {
            const t0 = performance.now();
            try {
                const ctl = new AbortController();
                const to = setTimeout(() => ctl.abort(), FETCH_PING_TIMEOUT);
                const res = await fetch(`${baseUrl}${PING_ENDPOINT_PATH}?load=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: ctl.signal });
                clearTimeout(to);
                if (res.ok) samples.push(performance.now() - t0);
            } catch { /* skip */ }
            if (stopped) break;
            // Sleep, but be interruptible by stop() so the loop doesn't hang
            // the outer `await runner` when tests cancel fast.
            await new Promise<void>(resolve => {
                const timer = setTimeout(() => { wakeSleep = null; resolve(); }, LOADED_PING_INTERVAL_MS);
                wakeSleep = () => { clearTimeout(timer); wakeSleep = null; resolve(); };
            });
        }
    }

    const runner = loop();

    return {
        stop: async () => {
            stopped = true;
            if (wakeSleep) wakeSleep();
            await runner;
            return samples;
        },
    };
}

async function detectIpFamily(baseUrl: string): Promise<{ ipv4Ok?: boolean; ipv6Ok?: boolean }> {
    try {
        const res = await fetchWithTimeout(`${baseUrl}/ip?t=${Date.now()}`, { cache: 'no-store' }, 5000);
        if (!res.ok) return {};
        const data = await res.json() as { family?: string };
        if (data.family === 'ipv4') return { ipv4Ok: true };
        if (data.family === 'ipv6') return { ipv6Ok: true };
        return {};
    } catch {
        return {};
    }
}

function extractDnsMs(urlPrefix: string): number | undefined {
    // Scan recent resource entries for the most recent request to our server.
    // Returns domainLookupEnd - domainLookupStart if the origin honored
    // Timing-Allow-Origin; otherwise returns undefined (zeros are filtered out).
    try {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        for (let i = entries.length - 1; i >= 0; i--) {
            const e = entries[i];
            if (!e.name.startsWith(urlPrefix)) continue;
            const dns = e.domainLookupEnd - e.domainLookupStart;
            if (dns > 0) return dns;
        }
    } catch { /* no perf api */ }
    return undefined;
}

// Timestamped cumulative-bytes sample used by windowed speed calc.
interface ByteSample { t: number; bytes: number }

// Given samples ordered by t, return cumulative bytes at time tTarget
// by linear interpolation between adjacent samples.
function bytesAtTime(samples: ByteSample[], tTarget: number): number {
    if (samples.length === 0) return 0;
    if (tTarget <= samples[0].t) return samples[0].bytes;
    if (tTarget >= samples[samples.length - 1].t) return samples[samples.length - 1].bytes;
    for (let i = 1; i < samples.length; i++) {
        if (samples[i].t >= tTarget) {
            const a = samples[i - 1];
            const b = samples[i];
            const ratio = (tTarget - a.t) / (b.t - a.t || 1);
            return a.bytes + (b.bytes - a.bytes) * ratio;
        }
    }
    return samples[samples.length - 1].bytes;
}

function speedFromWindow(samples: ByteSample[], startMs: number, endMs: number): number {
    const durS = (endMs - startMs) / 1000;
    if (durS <= 0) return 0;
    const delta = bytesAtTime(samples, endMs) - bytesAtTime(samples, startMs);
    return (delta * 8 / durS) / (1024 * 1024);
}

async function measureDownloadSpeed(baseUrl: string): Promise<number> {
    // Warm-up: establish TCP + TLS connection before timing
    await sendProgress({ status: 'Warming up connection...' });
    try {
        await fetchWithTimeout(`${baseUrl}/ping?warmup=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }, 5000);
    } catch { /* warmup failure is non-fatal */ }

    await sendProgress({ status: 'Downloading test file...' });

    let totalBytes = 0;
    const startTime = performance.now();
    const testEndTarget = startTime + MEASURE_DURATION_MS;
    const samples: ByteSample[] = [{ t: 0, bytes: 0 }];
    const controllers: AbortController[] = [];
    let lastProgressMs = 0;

    async function streamOne(streamId: number): Promise<void> {
        while (performance.now() < testEndTarget && !testAbortController?.signal.aborted) {
            const ctl = new AbortController();
            controllers.push(ctl);
            try {
                const res = await fetch(`${baseUrl}${DOWNLOAD_CHUNK_PATH}?t=${Date.now()}_${streamId}`, {
                    cache: 'no-store',
                    signal: ctl.signal,
                });
                if (!res.ok || !res.body) throw new Error(`stream ${streamId} http ${res.status}`);
                const reader = res.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (performance.now() >= testEndTarget) {
                        try { await reader.cancel(); } catch { /* ignore */ }
                        try { ctl.abort(); } catch { /* ignore */ }
                        break;
                    }
                    totalBytes += value.byteLength;
                    const t = performance.now() - startTime;
                    samples.push({ t, bytes: totalBytes });

                    if (t - lastProgressMs > 250) {
                        lastProgressMs = t;
                        const elapsedS = t / 1000;
                        if (elapsedS > 0.5) {
                            const liveSpeed = (totalBytes * 8 / elapsedS) / (1024 * 1024);
                            await sendProgress({ downloadSpeed: liveSpeed, status: 'Downloading...' });
                        }
                    }
                }
            } catch { /* stream dropped or aborted — another iteration will take over */ }
        }
    }

    const streams = Array.from({ length: PARALLEL_DOWNLOAD_STREAMS }, (_, i) => streamOne(i));
    const hardDeadline = new Promise<void>(resolve => setTimeout(resolve, MEASURE_DURATION_MS + 2000));
    await Promise.race([Promise.all(streams), hardDeadline]);
    controllers.forEach(c => { try { c.abort(); } catch { /* ignore */ } });

    // Windowed speed: trim ramp-up and tail to get steady-state throughput.
    const usableEnd = Math.min(MEASURE_DURATION_MS - TAIL_TRIM_MS, performance.now() - startTime);
    const windowStart = RAMP_UP_TRIM_MS;
    if (usableEnd <= windowStart) {
        // test was too short — fall back to naive total/time
        const totalS = (performance.now() - startTime) / 1000 || 0.001;
        const speed = (totalBytes * 8 / totalS) / (1024 * 1024);
        await sendProgress({ downloadSpeed: speed, status: 'Download complete' });
        return speed;
    }
    const speedMbps = speedFromWindow(samples, windowStart, usableEnd);
    await sendProgress({ downloadSpeed: speedMbps, status: 'Download complete' });
    return speedMbps;
}

async function measureUploadSpeed(baseUrl: string): Promise<number> {
    await sendProgress({ status: 'Preparing upload...' });
    // Warm-up for upload path
    try {
        await fetchWithTimeout(`${baseUrl}/ping?warmup_ul=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }, 5000);
    } catch { /* non-fatal */ }

    await sendProgress({ status: 'Uploading test data...' });

    const uploadSize = UPLOAD_CHUNK_MB * 1024 * 1024;
    const payload = new Uint8Array(uploadSize); // shared across streams, immutable

    let totalBytes = 0;
    const startTime = performance.now();
    const endTarget = startTime + MEASURE_DURATION_MS;
    const samples: ByteSample[] = [{ t: 0, bytes: 0 }];
    const controllers: AbortController[] = [];
    let lastProgressMs = 0;

    async function uploadOne(streamId: number): Promise<void> {
        while (performance.now() < endTarget && !testAbortController?.signal.aborted) {
            const ctl = new AbortController();
            controllers.push(ctl);
            const chunkStart = performance.now();
            try {
                const res = await fetch(`${baseUrl}${UPLOAD_ENDPOINT_PATH}?t=${Date.now()}_${streamId}`, {
                    method: 'POST',
                    cache: 'no-store',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    body: payload,
                    signal: ctl.signal,
                });
                if (!res.ok) throw new Error(`upload ${streamId} http ${res.status}`);
                await res.text();
                // Credit bytes at completion time (fetch API won't stream upload progress in MV3)
                totalBytes += uploadSize;
                const t = performance.now() - startTime;
                samples.push({ t, bytes: totalBytes });

                if (t - lastProgressMs > 250) {
                    lastProgressMs = t;
                    const elapsedS = t / 1000;
                    if (elapsedS > 0.5) {
                        const liveSpeed = (totalBytes * 8 / elapsedS) / (1024 * 1024);
                        await sendProgress({ uploadSpeed: liveSpeed, status: 'Uploading...' });
                    }
                }
                // Avoid an endless-fast loop for tiny chunks
                if (performance.now() - chunkStart < 50) {
                    await new Promise(r => setTimeout(r, 50));
                }
            } catch { /* drop this stream iteration */ }
        }
    }

    const streams = Array.from({ length: PARALLEL_UPLOAD_STREAMS }, (_, i) => uploadOne(i));
    const hardDeadline = new Promise<void>(resolve => setTimeout(resolve, MEASURE_DURATION_MS + 2000));
    await Promise.race([Promise.all(streams), hardDeadline]);
    controllers.forEach(c => { try { c.abort(); } catch { /* ignore */ } });

    const usableEnd = Math.min(MEASURE_DURATION_MS - TAIL_TRIM_MS, performance.now() - startTime);
    const windowStart = RAMP_UP_TRIM_MS;
    if (usableEnd <= windowStart) {
        const totalS = (performance.now() - startTime) / 1000 || 0.001;
        const speed = (totalBytes * 8 / totalS) / (1024 * 1024);
        await sendProgress({ uploadSpeed: speed, status: 'Upload complete' });
        return speed;
    }
    const speedMbps = speedFromWindow(samples, windowStart, usableEnd);
    await sendProgress({ uploadSpeed: speedMbps, status: 'Upload complete' });
    return speedMbps;
}

async function measurePingAndJitter(baseUrl: string): Promise<PingResult> {
    await sendProgress({ status: 'Measuring latency...' });
    const url = `${baseUrl}${PING_ENDPOINT_PATH}?t=`;
    const latencies: number[] = [];
    let lost = 0;

    for (let i = 0; i < PING_COUNT; i++) {
        const startTime = performance.now();
        try {
            const response = await fetchWithTimeout(
                `${url}${Date.now()}_${i}`,
                { method: 'HEAD', cache: 'no-store' },
                FETCH_PING_TIMEOUT
            );
            if (!response.ok) throw new Error(`Ping failed: ${response.status}`);
            const endTime = performance.now();
            const latency = endTime - startTime;
            latencies.push(latency);
            await sendProgress({ status: `Pong ${i + 1}/${PING_COUNT}! (${latency.toFixed(1)}ms)` });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Ping ${i + 1} error:`, msg);
            lost++;
            await sendProgress({ status: `Ping ${i + 1}/${PING_COUNT} lost` });
        }
        if (i < PING_COUNT - 1) await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (latencies.length === 0) {
        throw new Error(`All ${PING_COUNT} pings failed (100% packet loss)`);
    }

    const averagePing = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    let jitterSum = 0;
    for (let i = 0; i < latencies.length - 1; i++) {
        jitterSum += Math.abs(latencies[i + 1] - latencies[i]);
    }
    const jitter = latencies.length > 1 ? jitterSum / (latencies.length - 1) : 0;
    const packetLoss = (lost / PING_COUNT) * 100;

    await sendProgress({
        ping: averagePing,
        jitter,
        packetLoss,
        status: `Latency measured${lost > 0 ? ` (${packetLoss.toFixed(0)}% loss)` : ''}`
    });
    return { ping: averagePing, jitter, packetLoss };
}

// --- Main Test Orchestration ---
let isTestRunning = false;
let testAbortController: AbortController | null = null;

function checkCancelled(): void {
    if (testAbortController?.signal.aborted) {
        throw new Error('Test cancelled');
    }
}

async function runFullTest(): Promise<TestResults> {
    if (isTestRunning) {
        return { status: "Test in progress..." };
    }
    isTestRunning = true;
    testAbortController = new AbortController();

    const results: TestResults = {
        downloadSpeed: undefined,
        uploadSpeed: undefined,
        ping: undefined,
        jitter: undefined,
        packetLoss: undefined,
        status: 'Initializing test...'
    };

    try {
        // Resolve server URL once at the start
        const baseUrl = await getServerUrl();
        await sendProgress({ status: results.status });

        // IP family detect runs early and non-fatally
        detectIpFamily(baseUrl).then(f => {
            results.ipv4Ok = f.ipv4Ok;
            results.ipv6Ok = f.ipv6Ok;
        }).catch(() => { /* non-fatal */ });

        checkCancelled();
        const loadedProbe = startLoadedPingProbe(baseUrl);
        results.downloadSpeed = await measureDownloadSpeed(baseUrl);
        const loadedSamples = await loadedProbe.stop();

        // DNS timing captured from the most recent resource entry to our server
        results.dnsLookupMs = extractDnsMs(baseUrl);

        checkCancelled();
        results.uploadSpeed = await measureUploadSpeed(baseUrl);
        checkCancelled();
        // Wait 1s after upload for router buffers to drain (prevents bufferbloat from inflating ping)
        await sendProgress({ status: 'Settling connection...' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        checkCancelled();
        const pingResult = await measurePingAndJitter(baseUrl);
        results.ping = pingResult.ping;
        results.jitter = pingResult.jitter;
        results.packetLoss = pingResult.packetLoss;

        // Bufferbloat = loaded ping median minus idle ping. Graded A-F.
        if (loadedSamples.length > 0 && results.ping !== undefined) {
            const sorted = [...loadedSamples].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const delta = Math.max(0, median - results.ping);
            results.bufferbloatDelta = delta;
            results.bufferbloatGrade = gradeBufferbloat(delta);
        }

        results.status = 'Test complete';

        // Set badge with download speed
        if (results.downloadSpeed !== undefined) {
            const badgeText = results.downloadSpeed >= 100
                ? `${Math.round(results.downloadSpeed)}`
                : results.downloadSpeed.toFixed(1);
            await chrome.action.setBadgeText({ text: badgeText });
            await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
        }

        await sendCompletion(results);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error("Test failed:", msg);
        results.status = `Test failed: ${msg}`;
        await sendError(results.status);
        await sendCompletion(results);
    } finally {
        isTestRunning = false;
        testAbortController = null;
    }
    return results;
}

// --- Scheduled background tests ---
async function rescheduleTestsFromPrefs(): Promise<void> {
    try {
        const { scheduleMinutes } = await chrome.storage.sync.get('scheduleMinutes');
        const minutes = Number(scheduleMinutes) || 0;
        await chrome.alarms.clear(SCHEDULE_ALARM_NAME);
        if (minutes > 0) {
            chrome.alarms.create(SCHEDULE_ALARM_NAME, { periodInMinutes: minutes, delayInMinutes: minutes });
        }
    } catch (e) {
        console.error('Reschedule failed:', e);
    }
}

function qualityGrade(dl?: number, ul?: number, ping?: number): 'excellent' | 'good' | 'fair' | 'poor' | null {
    if (dl === undefined || ul === undefined || ping === undefined) return null;
    if (dl >= 50 && ul >= 20 && ping < 30) return 'excellent';
    if (dl >= 20 && ul >= 10 && ping < 60) return 'good';
    if (dl >= 5 && ul >= 2 && ping < 150) return 'fair';
    return 'poor';
}

async function maybeNotifyQualityDrop(current: TestResults): Promise<void> {
    try {
        const { notifyOnDrop } = await chrome.storage.sync.get('notifyOnDrop');
        if (!notifyOnDrop) return;
        const grade = qualityGrade(current.downloadSpeed, current.uploadSpeed, current.ping);
        if (grade !== 'poor') return;
        await chrome.notifications.create(QUALITY_DROP_NOTIFICATION_ID, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icons128.png'),
            title: 'MeterX — connection quality dropped',
            message: `Poor: ${(current.downloadSpeed ?? 0).toFixed(1)} Mbps down, ping ${(current.ping ?? 0).toFixed(0)}ms.`,
            priority: 1,
        });
    } catch (e) {
        console.error('Notify failed:', e);
    }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== SCHEDULE_ALARM_NAME) return;
    const result = await runFullTest();
    if (result.status.startsWith('Test complete')) {
        await maybeNotifyQualityDrop(result);
    }
});

chrome.runtime.onInstalled.addListener(() => { rescheduleTestsFromPrefs(); });
chrome.runtime.onStartup.addListener(() => { rescheduleTestsFromPrefs(); });

// Side Panel — open on action click when popup disabled, plus available via API
if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => { /* old chrome */ });
}

chrome.runtime.onMessage.addListener(
    (message: { action: string; url?: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
        if (message.action === "startTest") {
            runFullTest().then(result => {
                sendResponse({ status: result.status || "Test initiated..." });
            }).catch((error: Error) => {
                sendResponse({ status: `Error: ${error.message}` });
            });
            return true;
        }
        if (message.action === "cancelTest") {
            if (testAbortController) {
                testAbortController.abort();
            }
            sendResponse({ status: "Cancelled" });
            return false;
        }
        if (message.action === "getServerUrl") {
            getServerUrl().then(url => sendResponse({ url }));
            return true;
        }
        if (message.action === "rescheduleTests") {
            rescheduleTestsFromPrefs().then(() => sendResponse({ success: true }));
            return true;
        }
        if (message.action === "openSidePanel") {
            if (chrome.sidePanel?.open && _sender.tab?.windowId !== undefined) {
                chrome.sidePanel.open({ windowId: _sender.tab.windowId }).catch(() => { /* not supported */ });
            }
            sendResponse({ success: true });
            return false;
        }
        if (message.action === "setServerUrl") {
            const url = message.url?.trim() || '';
            if (url) {
                chrome.storage.sync.set({ serverUrl: url }).then(() => sendResponse({ success: true }));
            } else {
                chrome.storage.sync.remove('serverUrl').then(() => sendResponse({ success: true }));
            }
            return true;
        }
    }
);

console.log("MeterX Background Service: Ready");
