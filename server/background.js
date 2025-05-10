// background.js

// Configuration
// !! IMPORTANT SERVER NOTE !!
// The current TEST_SERVER_BASE_URL and DOWNLOAD_FILE_PATH for the download test
// (https://lavish-polite-fenugreek.glitch.me/test-file/25MB.bin) seems to be returning a 404 error.
// Please ensure your test server is correctly configured and accessible, or update these URLs.
// const TEST_SERVER_BASE_URL = 'http://localhost:3000'; // Use your local server!
const TEST_SERVER_BASE_URL = 'https://meterx-speedtest-server.onrender.com';
const DOWNLOAD_FILE_MB = 1;  // Smaller file for quicker testing
const DOWNLOAD_FILE_PATH = `/test-file/${DOWNLOAD_FILE_MB}MB.bin`;
const UPLOAD_DATA_SIZE_MB = 1; // Smaller file for quicker testing
const UPLOAD_ENDPOINT_PATH = '/upload';
const PING_ENDPOINT_PATH = '/ping';
const PING_COUNT = 5;
const FETCH_DOWNLOAD_TIMEOUT = 60000; // 60 seconds for download
const FETCH_UPLOAD_TIMEOUT = 60000;   // 60 seconds for upload
const FETCH_PING_TIMEOUT = 5000;      // 5 seconds for each ping


async function sendProgress(data) {
    try {
        // Filter out undefined properties before sending
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        await chrome.runtime.sendMessage({ action: "testProgress", data: cleanData });
    } catch (error) { /* Popup might be closed */ }
}

async function sendCompletion(data) {
    try {
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        await chrome.runtime.sendMessage({ action: "testComplete", data: cleanData });
    } catch (error) { /* Popup might be closed */ }
}

async function sendError(errorMessage) {
    try {
        await chrome.runtime.sendMessage({ action: "testError", error: errorMessage });
    } catch (error) { /* Popup might be closed */ }
}

// --- Fetch with Timeout Utility ---
async function fetchWithTimeout(resource, options = {}, timeout) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout / 1000}s`);
        }
        throw error;
    }
}

// --- Test Functions ---

async function measureDownloadSpeed() {
    await sendProgress({ status: 'Fetching the bits... 📥' });
    const url = `${TEST_SERVER_BASE_URL}${DOWNLOAD_FILE_PATH}?t=${Date.now()}`;
    const startTime = performance.now();
    try {
        const response = await fetchWithTimeout(url, { cache: 'no-store' }, FETCH_DOWNLOAD_TIMEOUT);
        if (!response.ok) {
             // Improved error handling with status text
            throw new Error(`Download failed: ${response.status} - ${response.statusText}`);
        }
        const data = await response.arrayBuffer();
        const endTime = performance.now();
        const durationSeconds = (endTime - startTime) / 1000;
        if (durationSeconds === 0) throw new Error("Download too fast to measure!"); // Avoid division by zero
        const bitsLoaded = data.byteLength * 8;
        const speedMbps = (bitsLoaded / durationSeconds) / (1024 * 1024);
        await sendProgress({ downloadSpeed: speedMbps, status: 'Download done! Zoom! 💨' });
        return speedMbps;
    } catch (error) {
        console.error('Download test error:', error);
        await sendError(`Download failed: ${error.message}`);
        return 0;  // Return 0 on error to avoid undefined in results
    }
}

async function measureUploadSpeed() {
    await sendProgress({ status: 'Sending your vibes... 📤' });
    const url = `${TEST_SERVER_BASE_URL}${UPLOAD_ENDPOINT_PATH}?t=${Date.now()}`;
    const dataSize = UPLOAD_DATA_SIZE_MB * 1024 * 1024;
    const dataToSend = new Uint8Array(dataSize); // Dummy data is fine

    const startTime = performance.now();
    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST', cache: 'no-store',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: dataToSend
        }, FETCH_UPLOAD_TIMEOUT);
        if (!response.ok) throw new Error(`Server upload shy: ${response.status}`);
        await response.text();
        const endTime = performance.now();
        const durationSeconds = (endTime - startTime) / 1000;
        if (durationSeconds === 0) throw new Error("Upload too fast to measure!");
        const bitsUploaded = dataSize * 8;
        const speedMbps = (bitsUploaded / durationSeconds) / (1024 * 1024);
        await sendProgress({ uploadSpeed: speedMbps, status: 'Upload complete! Sent! 🚀' });
        return speedMbps;
    } catch (error) {
        console.error('Upload test error:', error);
        await sendError(`Upload stumble: ${error.message}`);
        throw error;
    }
}

async function measurePingAndJitter() {
    await sendProgress({ status: 'Pinging the void... 핑!' });
    const url = `${TEST_SERVER_BASE_URL}${PING_ENDPOINT_PATH}?t=`;
    let latencies = [];
    let totalPingTime = 0;

    for (let i = 0; i < PING_COUNT; i++) {
        const startTime = performance.now();
        try {
            const response = await fetchWithTimeout(`${url}${Date.now()}_${i}`, { method: 'HEAD', cache: 'no-store' }, FETCH_PING_TIMEOUT);
            if (!response.ok) throw new Error(`Ping ghosted: ${response.status}`);
            const endTime = performance.now();
            const latency = endTime - startTime;
            latencies.push(latency);
            totalPingTime += latency;
            await sendProgress({ status: `Pong ${i + 1}/${PING_COUNT}! (${latency.toFixed(1)}ms)` });
            if (i < PING_COUNT -1) await new Promise(resolve => setTimeout(resolve, 200)); // Slightly longer delay
        } catch (error) {
            console.error(`Ping ${i + 1} error:`, error);
            latencies.push(1000); // Penalize failed pings
            await sendProgress({ status: `Ping ${i + 1}/${PING_COUNT} lost... 😢` });
        }
    }

    if (latencies.length === 0) {
        await sendError('No pongs received. Sad.');
        throw new Error('All pings failed.');
    }

    const averagePing = totalPingTime / latencies.length;
    let jitterSum = 0;
    for (let i = 0; i < latencies.length - 1; i++) {
        jitterSum += Math.abs(latencies[i+1] - latencies[i]);
    }
    const jitter = latencies.length > 1 ? jitterSum / (latencies.length - 1) : 0;

    await sendProgress({ ping: averagePing, jitter: jitter, status: 'Ping & Jitter: Nailed it! 🎯' });
    return { ping: averagePing, jitter };
}

// --- Main Test Orchestration ---
let isTestRunning = false;

async function runFullTest() {
    if (isTestRunning) {
        console.log("Hold your horses! Test already running.");
        return { status: "Test in progress..." };
    }
    isTestRunning = true;
    
    let results = {
        downloadSpeed: undefined, // Use undefined to avoid sending 0 initially
        uploadSpeed: undefined,
        ping: undefined,
        jitter: undefined,
        status: 'Ignition sequence start... 🌠'
    };

    try {
        await sendProgress({ status: results.status });

        results.downloadSpeed = await measureDownloadSpeed();

        results.uploadSpeed = await measureUploadSpeed();

        const pingJitterResult = await measurePingAndJitter();
        results.ping = pingJitterResult.ping;
        results.jitter = pingJitterResult.jitter;
        
        results.status = 'All tests complete!'; // This will be overridden by sendCompletion message
        await sendCompletion(results);

    } catch (error) {
        console.error("Full test sequence kaput:", error);
        // Error message is sent by the failing function
        // Send final partial results
        results.status = `Test failed: ${error.message || 'Mysterious space anomaly'}`;
        await sendCompletion(results); // Send partial results if any and error status
    } finally {
        isTestRunning = false;
    }
    return results; // Primarily for the direct response to sendMessage if needed
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "startTest") {
        runFullTest().then(finalStatusObject => {
            sendResponse({ status: finalStatusObject.status || "Test initiated..."});
        }).catch(error => {
            sendResponse({ status: `Initiation error: ${error.message}`});
        });
        return true; // Asynchronous response
    }
});

console.log("MeterX Background Service: Ready for action! 🦾");