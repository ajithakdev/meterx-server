/**
 * MeterX Background Service Worker
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license MIT
 * @version 2026.0.319-MR1.0
 */

/// <reference types="chrome" />

// --- Configuration ---
const TEST_SERVER_BASE_URL = 'https://meterx-speedtest-server.onrender.com';
const DOWNLOAD_FILE_MB = 1;
const DOWNLOAD_FILE_PATH = `/test-file/${DOWNLOAD_FILE_MB}MB.bin`;
const UPLOAD_DATA_SIZE_MB = 1;
const UPLOAD_ENDPOINT_PATH = '/upload';
const PING_ENDPOINT_PATH = '/ping';
const PING_COUNT = 5;
const FETCH_DOWNLOAD_TIMEOUT = 60000;
const FETCH_UPLOAD_TIMEOUT = 60000;
const FETCH_PING_TIMEOUT = 5000;

// --- Types ---
interface TestProgress {
    status?: string;
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
}

interface TestResults {
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
    status: string;
}

interface PingResult {
    ping: number;
    jitter: number;
    packetLoss: number;
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

async function measureDownloadSpeed(): Promise<number> {
    await sendProgress({ status: 'Fetching the bits... 📥' });
    const url = `${TEST_SERVER_BASE_URL}${DOWNLOAD_FILE_PATH}?t=${Date.now()}`;
    const startTime = performance.now();

    const response = await fetchWithTimeout(url, { cache: 'no-store' }, FETCH_DOWNLOAD_TIMEOUT);
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    if (durationSeconds === 0) throw new Error("Download too fast to measure");

    const bitsLoaded = data.byteLength * 8;
    const speedMbps = (bitsLoaded / durationSeconds) / (1024 * 1024);
    await sendProgress({ downloadSpeed: speedMbps, status: 'Download done! Zoom! 💨' });
    return speedMbps;
}

async function measureUploadSpeed(): Promise<number> {
    await sendProgress({ status: 'Sending your vibes... 📤' });
    const url = `${TEST_SERVER_BASE_URL}${UPLOAD_ENDPOINT_PATH}?t=${Date.now()}`;
    const dataSize = UPLOAD_DATA_SIZE_MB * 1024 * 1024;
    const dataToSend = new Uint8Array(dataSize);

    const startTime = performance.now();
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: dataToSend
    }, FETCH_UPLOAD_TIMEOUT);
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
    await response.text();
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    if (durationSeconds === 0) throw new Error("Upload too fast to measure");

    const bitsUploaded = dataSize * 8;
    const speedMbps = (bitsUploaded / durationSeconds) / (1024 * 1024);
    await sendProgress({ uploadSpeed: speedMbps, status: 'Upload complete! Sent! 🚀' });
    return speedMbps;
}

async function measurePingAndJitter(): Promise<PingResult> {
    await sendProgress({ status: 'Pinging the void... 🏓' });
    const url = `${TEST_SERVER_BASE_URL}${PING_ENDPOINT_PATH}?t=`;
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
            await sendProgress({ status: `Ping ${i + 1}/${PING_COUNT} lost...` });
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
        status: `Ping & Jitter done! ${lost > 0 ? `(${packetLoss.toFixed(0)}% loss)` : '🎯'}`
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
        status: 'Ignition sequence start... 🌠'
    };

    try {
        await sendProgress({ status: results.status });

        checkCancelled();
        results.downloadSpeed = await measureDownloadSpeed();
        checkCancelled();
        results.uploadSpeed = await measureUploadSpeed();
        checkCancelled();
        const pingResult = await measurePingAndJitter();
        results.ping = pingResult.ping;
        results.jitter = pingResult.jitter;
        results.packetLoss = pingResult.packetLoss;

        results.status = 'All tests complete! 🎉';

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

chrome.runtime.onMessage.addListener(
    (message: { action: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
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
    }
);

console.log("MeterX Background Service: Ready!");
