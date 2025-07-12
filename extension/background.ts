
// TypeScript migration of background.js
// Add types for message passing and test results
let TEST_SERVER_BASE_URL = 'https://meterx-speedtest-server.onrender.com';
// Default values, will be overridden per test
let DOWNLOAD_FILE_MB = 1;
let DOWNLOAD_FILE_PATH = `/test-file/${DOWNLOAD_FILE_MB}MB.bin`;
let UPLOAD_DATA_SIZE_MB = 1;
const UPLOAD_ENDPOINT_PATH = '/upload';
const PING_ENDPOINT_PATH = '/ping';
const PING_COUNT = 5;
const FETCH_DOWNLOAD_TIMEOUT = 60000;
const FETCH_UPLOAD_TIMEOUT = 60000;
const FETCH_PING_TIMEOUT = 5000;

type TestResult = {
  downloadSpeed?: number;
  uploadSpeed?: number;
  ping?: number;
  jitter?: number;
  status?: string;
};

type Message = {
  action: string;
  data?: TestResult;
  error?: string;
};

async function sendProgress(data: TestResult) {
  try {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    // @ts-ignore
    await chrome.runtime.sendMessage({ action: "testProgress", data: cleanData });
  } catch (error) {}
}

async function sendCompletion(data: TestResult) {
  try {
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    // @ts-ignore
    await chrome.runtime.sendMessage({ action: "testComplete", data: cleanData });
  } catch (error) {}
}

async function sendError(errorMessage: string) {
  try {
    // @ts-ignore
    await chrome.runtime.sendMessage({ action: "testError", error: errorMessage });
  } catch (error) {}
}

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
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

async function measureDownloadSpeed(): Promise<number> {
  await sendProgress({ status: 'Fetching the bits... 📥' });
  const url = `${TEST_SERVER_BASE_URL}/test-file/${DOWNLOAD_FILE_MB}MB.bin?t=${Date.now()}`;
  const startTime = performance.now();
  try {
    const response = await fetchWithTimeout(url, { cache: 'no-store' }, FETCH_DOWNLOAD_TIMEOUT);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} - ${response.statusText}`);
    }
    const data = await response.arrayBuffer();
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    if (durationSeconds === 0) throw new Error("Download too fast to measure!");
    const bitsLoaded = data.byteLength * 8;
    const speedMbps = (bitsLoaded / durationSeconds) / (1024 * 1024);
    await sendProgress({ downloadSpeed: speedMbps, status: 'Download done! Zoom! 💨' });
    return speedMbps;
  } catch (error: any) {
    console.error('Download test error:', error);
    await sendError(`Download failed: ${error.message}`);
    return 0;
  }
}

async function measureUploadSpeed(): Promise<number> {
  await sendProgress({ status: 'Sending your vibes... 📤' });
  const url = `${TEST_SERVER_BASE_URL}${UPLOAD_ENDPOINT_PATH}?t=${Date.now()}`;
  const dataSize = UPLOAD_DATA_SIZE_MB * 1024 * 1024;
  const dataToSend = new Uint8Array(dataSize);
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
  } catch (error: any) {
    console.error('Upload test error:', error);
    await sendError(`Upload stumble: ${error.message}`);
    throw error;
  }
}

async function measurePingAndJitter(): Promise<{ ping: number; jitter: number }> {
  await sendProgress({ status: 'Pinging the void... 핑!' });
  const url = `${TEST_SERVER_BASE_URL}${PING_ENDPOINT_PATH}?t=`;
  let latencies: number[] = [];
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
      if (i < PING_COUNT - 1) await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Ping ${i + 1} error:`, error);
      latencies.push(1000);
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
    jitterSum += Math.abs(latencies[i + 1] - latencies[i]);
  }
  const jitter = latencies.length > 1 ? jitterSum / (latencies.length - 1) : 0;
  await sendProgress({ ping: averagePing, jitter: jitter, status: 'Ping & Jitter: Nailed it! 🎯' });
  return { ping: averagePing, jitter };
}

let isTestRunning = false;

async function runFullTest(fileSizeMB: number = 1, serverUrl: string = 'https://meterx-speedtest-server.onrender.com'): Promise<TestResult> {
  if (isTestRunning) {
    console.log("Hold your horses! Test already running.");
    return { status: "Test in progress..." };
  }
  isTestRunning = true;
  DOWNLOAD_FILE_MB = fileSizeMB;
  DOWNLOAD_FILE_PATH = `/test-file/${DOWNLOAD_FILE_MB}MB.bin`;
  UPLOAD_DATA_SIZE_MB = fileSizeMB;
  TEST_SERVER_BASE_URL = serverUrl;
  let results: TestResult = {
    downloadSpeed: undefined,
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
    results.status = 'All tests complete!';
    await sendCompletion(results);
  } catch (error: any) {
    console.error("Full test sequence kaput:", error);
    results.status = `Test failed: ${error.message || 'Mysterious space anomaly'}`;
    await sendCompletion(results);
  } finally {
    isTestRunning = false;
  }
  return results;
}

// @ts-ignore
chrome.runtime.onMessage.addListener((message: Message & { fileSizeMB?: number, serverUrl?: string }, sender: any, sendResponse: any) => {
  if (message.action === "startTest") {
    const fileSizeMB = message.fileSizeMB || 1;
    const serverUrl = message.serverUrl || 'https://meterx-speedtest-server.onrender.com';
    runFullTest(fileSizeMB, serverUrl).then(finalStatusObject => {
      sendResponse({ status: finalStatusObject.status || "Test initiated..." });
    }).catch(error => {
      sendResponse({ status: `Initiation error: ${error.message}` });
    });
    return true;
  }
});

console.log("MeterX Background Service: Ready for action! 🦾");
