var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// TypeScript migration of background.js
// Add types for message passing and test results
var TEST_SERVER_BASE_URL = 'https://meterx-speedtest-server.onrender.com';
// Default values, will be overridden per test
var DOWNLOAD_FILE_MB = 1;
var DOWNLOAD_FILE_PATH = "/test-file/".concat(DOWNLOAD_FILE_MB, "MB.bin");
var UPLOAD_DATA_SIZE_MB = 1;
var UPLOAD_ENDPOINT_PATH = '/upload';
var PING_ENDPOINT_PATH = '/ping';
var PING_COUNT = 5;
var FETCH_DOWNLOAD_TIMEOUT = 60000;
var FETCH_UPLOAD_TIMEOUT = 60000;
var FETCH_PING_TIMEOUT = 5000;
function sendProgress(data) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanData, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    cleanData = Object.fromEntries(Object.entries(data).filter(function (_a) {
                        var _ = _a[0], v = _a[1];
                        return v !== undefined;
                    }));
                    // @ts-ignore
                    return [4 /*yield*/, chrome.runtime.sendMessage({ action: "testProgress", data: cleanData })];
                case 1:
                    // @ts-ignore
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function sendCompletion(data) {
    return __awaiter(this, void 0, void 0, function () {
        var cleanData, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    cleanData = Object.fromEntries(Object.entries(data).filter(function (_a) {
                        var _ = _a[0], v = _a[1];
                        return v !== undefined;
                    }));
                    // @ts-ignore
                    return [4 /*yield*/, chrome.runtime.sendMessage({ action: "testComplete", data: cleanData })];
                case 1:
                    // @ts-ignore
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_2 = _a.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function sendError(errorMessage) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // @ts-ignore
                    return [4 /*yield*/, chrome.runtime.sendMessage({ action: "testError", error: errorMessage })];
                case 1:
                    // @ts-ignore
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function fetchWithTimeout(resource_1) {
    return __awaiter(this, arguments, void 0, function (resource, options, timeout) {
        var controller, id, response, error_4;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    controller = new AbortController();
                    id = setTimeout(function () { return controller.abort(); }, timeout);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(resource, __assign(__assign({}, options), { signal: controller.signal }))];
                case 2:
                    response = _a.sent();
                    clearTimeout(id);
                    return [2 /*return*/, response];
                case 3:
                    error_4 = _a.sent();
                    clearTimeout(id);
                    if (error_4.name === 'AbortError') {
                        throw new Error("Request timed out after ".concat(timeout / 1000, "s"));
                    }
                    throw error_4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function measureDownloadSpeed() {
    return __awaiter(this, void 0, void 0, function () {
        var url, startTime, response, data, endTime, durationSeconds, bitsLoaded, speedMbps, error_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendProgress({ status: 'Fetching the bits... 📥' })];
                case 1:
                    _a.sent();
                    url = "".concat(TEST_SERVER_BASE_URL, "/test-file/").concat(DOWNLOAD_FILE_MB, "MB.bin?t=").concat(Date.now());
                    startTime = performance.now();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 8]);
                    return [4 /*yield*/, fetchWithTimeout(url, { cache: 'no-store' }, FETCH_DOWNLOAD_TIMEOUT)];
                case 3:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Download failed: ".concat(response.status, " - ").concat(response.statusText));
                    }
                    return [4 /*yield*/, response.arrayBuffer()];
                case 4:
                    data = _a.sent();
                    endTime = performance.now();
                    durationSeconds = (endTime - startTime) / 1000;
                    if (durationSeconds === 0)
                        throw new Error("Download too fast to measure!");
                    bitsLoaded = data.byteLength * 8;
                    speedMbps = (bitsLoaded / durationSeconds) / (1024 * 1024);
                    return [4 /*yield*/, sendProgress({ downloadSpeed: speedMbps, status: 'Download done! Zoom! 💨' })];
                case 5:
                    _a.sent();
                    return [2 /*return*/, speedMbps];
                case 6:
                    error_5 = _a.sent();
                    console.error('Download test error:', error_5);
                    return [4 /*yield*/, sendError("Download failed: ".concat(error_5.message))];
                case 7:
                    _a.sent();
                    return [2 /*return*/, 0];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function measureUploadSpeed() {
    return __awaiter(this, void 0, void 0, function () {
        var url, dataSize, dataToSend, startTime, response, endTime, durationSeconds, bitsUploaded, speedMbps, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendProgress({ status: 'Sending your vibes... 📤' })];
                case 1:
                    _a.sent();
                    url = "".concat(TEST_SERVER_BASE_URL).concat(UPLOAD_ENDPOINT_PATH, "?t=").concat(Date.now());
                    dataSize = UPLOAD_DATA_SIZE_MB * 1024 * 1024;
                    dataToSend = new Uint8Array(dataSize);
                    startTime = performance.now();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 6, , 8]);
                    return [4 /*yield*/, fetchWithTimeout(url, {
                            method: 'POST', cache: 'no-store',
                            headers: { 'Content-Type': 'application/octet-stream' },
                            body: dataToSend
                        }, FETCH_UPLOAD_TIMEOUT)];
                case 3:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Server upload shy: ".concat(response.status));
                    return [4 /*yield*/, response.text()];
                case 4:
                    _a.sent();
                    endTime = performance.now();
                    durationSeconds = (endTime - startTime) / 1000;
                    if (durationSeconds === 0)
                        throw new Error("Upload too fast to measure!");
                    bitsUploaded = dataSize * 8;
                    speedMbps = (bitsUploaded / durationSeconds) / (1024 * 1024);
                    return [4 /*yield*/, sendProgress({ uploadSpeed: speedMbps, status: 'Upload complete! Sent! 🚀' })];
                case 5:
                    _a.sent();
                    return [2 /*return*/, speedMbps];
                case 6:
                    error_6 = _a.sent();
                    console.error('Upload test error:', error_6);
                    return [4 /*yield*/, sendError("Upload stumble: ".concat(error_6.message))];
                case 7:
                    _a.sent();
                    throw error_6;
                case 8: return [2 /*return*/];
            }
        });
    });
}
function measurePingAndJitter() {
    return __awaiter(this, void 0, void 0, function () {
        var url, latencies, totalPingTime, i, startTime, response, endTime, latency, error_7, averagePing, jitterSum, i, jitter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sendProgress({ status: 'Pinging the void... 핑!' })];
                case 1:
                    _a.sent();
                    url = "".concat(TEST_SERVER_BASE_URL).concat(PING_ENDPOINT_PATH, "?t=");
                    latencies = [];
                    totalPingTime = 0;
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < PING_COUNT)) return [3 /*break*/, 11];
                    startTime = performance.now();
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 8, , 10]);
                    return [4 /*yield*/, fetchWithTimeout("".concat(url).concat(Date.now(), "_").concat(i), { method: 'HEAD', cache: 'no-store' }, FETCH_PING_TIMEOUT)];
                case 4:
                    response = _a.sent();
                    if (!response.ok)
                        throw new Error("Ping ghosted: ".concat(response.status));
                    endTime = performance.now();
                    latency = endTime - startTime;
                    latencies.push(latency);
                    totalPingTime += latency;
                    return [4 /*yield*/, sendProgress({ status: "Pong ".concat(i + 1, "/").concat(PING_COUNT, "! (").concat(latency.toFixed(1), "ms)") })];
                case 5:
                    _a.sent();
                    if (!(i < PING_COUNT - 1)) return [3 /*break*/, 7];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 10];
                case 8:
                    error_7 = _a.sent();
                    console.error("Ping ".concat(i + 1, " error:"), error_7);
                    latencies.push(1000);
                    return [4 /*yield*/, sendProgress({ status: "Ping ".concat(i + 1, "/").concat(PING_COUNT, " lost... \uD83D\uDE22") })];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10:
                    i++;
                    return [3 /*break*/, 2];
                case 11:
                    if (!(latencies.length === 0)) return [3 /*break*/, 13];
                    return [4 /*yield*/, sendError('No pongs received. Sad.')];
                case 12:
                    _a.sent();
                    throw new Error('All pings failed.');
                case 13:
                    averagePing = totalPingTime / latencies.length;
                    jitterSum = 0;
                    for (i = 0; i < latencies.length - 1; i++) {
                        jitterSum += Math.abs(latencies[i + 1] - latencies[i]);
                    }
                    jitter = latencies.length > 1 ? jitterSum / (latencies.length - 1) : 0;
                    return [4 /*yield*/, sendProgress({ ping: averagePing, jitter: jitter, status: 'Ping & Jitter: Nailed it! 🎯' })];
                case 14:
                    _a.sent();
                    return [2 /*return*/, { ping: averagePing, jitter: jitter }];
            }
        });
    });
}
var isTestRunning = false;
function runFullTest() {
    return __awaiter(this, arguments, void 0, function (fileSizeMB, serverUrl) {
        var results, _a, _b, pingJitterResult, error_8;
        if (fileSizeMB === void 0) { fileSizeMB = 1; }
        if (serverUrl === void 0) { serverUrl = 'https://meterx-speedtest-server.onrender.com'; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (isTestRunning) {
                        console.log("Hold your horses! Test already running.");
                        return [2 /*return*/, { status: "Test in progress..." }];
                    }
                    isTestRunning = true;
                    DOWNLOAD_FILE_MB = fileSizeMB;
                    DOWNLOAD_FILE_PATH = "/test-file/".concat(DOWNLOAD_FILE_MB, "MB.bin");
                    UPLOAD_DATA_SIZE_MB = fileSizeMB;
                    TEST_SERVER_BASE_URL = serverUrl;
                    results = {
                        downloadSpeed: undefined,
                        uploadSpeed: undefined,
                        ping: undefined,
                        jitter: undefined,
                        status: 'Ignition sequence start... 🌠'
                    };
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, 9, 10]);
                    return [4 /*yield*/, sendProgress({ status: results.status })];
                case 2:
                    _c.sent();
                    _a = results;
                    return [4 /*yield*/, measureDownloadSpeed()];
                case 3:
                    _a.downloadSpeed = _c.sent();
                    _b = results;
                    return [4 /*yield*/, measureUploadSpeed()];
                case 4:
                    _b.uploadSpeed = _c.sent();
                    return [4 /*yield*/, measurePingAndJitter()];
                case 5:
                    pingJitterResult = _c.sent();
                    results.ping = pingJitterResult.ping;
                    results.jitter = pingJitterResult.jitter;
                    results.status = 'All tests complete!';
                    return [4 /*yield*/, sendCompletion(results)];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 10];
                case 7:
                    error_8 = _c.sent();
                    console.error("Full test sequence kaput:", error_8);
                    results.status = "Test failed: ".concat(error_8.message || 'Mysterious space anomaly');
                    return [4 /*yield*/, sendCompletion(results)];
                case 8:
                    _c.sent();
                    return [3 /*break*/, 10];
                case 9:
                    isTestRunning = false;
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/, results];
            }
        });
    });
}
// @ts-ignore
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "startTest") {
        var fileSizeMB = message.fileSizeMB || 1;
        var serverUrl = message.serverUrl || 'https://meterx-speedtest-server.onrender.com';
        runFullTest(fileSizeMB, serverUrl).then(function (finalStatusObject) {
            sendResponse({ status: finalStatusObject.status || "Test initiated..." });
        }).catch(function (error) {
            sendResponse({ status: "Initiation error: ".concat(error.message) });
        });
        return true;
    }
});
console.log("MeterX Background Service: Ready for action! 🦾");
