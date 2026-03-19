/**
 * MeterX Popup UI
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license MIT
 * @version 2026.0.319-MR1.0
 */

/// <reference types="chrome" />

interface HistoryEntry {
    timestamp: number;
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
}

const MAX_HISTORY = 20;
const GAUGE_ARC_LENGTH = 126; // SVG arc length for dashoffset calculation
const MAX_SPEED_GAUGE = 200; // Mbps — gauge tops out here

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
    const downloadSpeedEl = document.getElementById('downloadSpeed') as HTMLElement;
    const uploadSpeedEl = document.getElementById('uploadSpeed') as HTMLElement;
    const pingEl = document.getElementById('ping') as HTMLElement;
    const jitterEl = document.getElementById('jitter') as HTMLElement;
    const packetLossEl = document.getElementById('packetLoss') as HTMLElement;
    const statusEl = document.getElementById('status') as HTMLElement;
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    const progressBar = document.getElementById('progress-bar') as HTMLElement;
    const qualityBadge = document.getElementById('quality-badge') as HTMLElement;
    const historyToggle = document.getElementById('historyToggle') as HTMLButtonElement;
    const historyList = document.getElementById('historyList') as HTMLElement;
    const downloadGauge = document.getElementById('downloadGauge') as unknown as SVGPathElement;
    const uploadGauge = document.getElementById('uploadGauge') as unknown as SVGPathElement;

    const segments = {
        ping: document.getElementById('seg-ping') as HTMLElement,
        download: document.getElementById('seg-download') as HTMLElement,
        upload: document.getElementById('seg-upload') as HTMLElement,
    };

    function setGauge(el: SVGPathElement, speedMbps: number): void {
        const ratio = Math.min(speedMbps / MAX_SPEED_GAUGE, 1);
        el.style.strokeDashoffset = String(GAUGE_ARC_LENGTH * (1 - ratio));
    }

    function resetGauges(): void {
        downloadGauge.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
        uploadGauge.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
    }

    function setSegment(phase: 'ping' | 'download' | 'upload'): void {
        const order: Array<'ping' | 'download' | 'upload'> = ['ping', 'download', 'upload'];
        const idx = order.indexOf(phase);
        order.forEach((seg, i) => {
            segments[seg].classList.toggle('active', i === idx);
            segments[seg].classList.toggle('done', i < idx);
        });
    }

    function getQuality(dl: number, ul: number, ping: number): { label: string; cls: string } {
        if (dl >= 50 && ul >= 20 && ping < 30) return { label: 'Excellent', cls: 'excellent' };
        if (dl >= 20 && ul >= 10 && ping < 60) return { label: 'Good', cls: 'good' };
        if (dl >= 5 && ul >= 2 && ping < 150) return { label: 'Fair', cls: 'fair' };
        return { label: 'Poor', cls: 'poor' };
    }

    function resetUI(): void {
        downloadSpeedEl.textContent = '-';
        uploadSpeedEl.textContent = '-';
        pingEl.textContent = '-';
        jitterEl.textContent = '-';
        packetLossEl.textContent = '-';
        statusEl.textContent = 'Ignition sequence start... 🌠';
        qualityBadge.classList.add('hidden');
        qualityBadge.className = 'quality-badge hidden';
        resetGauges();
        Object.values(segments).forEach(s => { s.classList.remove('active', 'done'); });
    }

    // --- Offline detection ---
    function checkOnline(): void {
        if (!navigator.onLine) {
            startButton.disabled = true;
            statusEl.textContent = 'You are offline';
        }
    }
    window.addEventListener('online', () => {
        startButton.disabled = false;
        statusEl.textContent = 'Back online! Click Start to measure.';
    });
    window.addEventListener('offline', () => {
        startButton.disabled = true;
        statusEl.textContent = 'You are offline';
    });
    checkOnline();

    // --- Start test ---
    startButton.addEventListener('click', () => {
        resetUI();
        startButton.disabled = true;
        cancelButton.classList.remove('hidden');
        progressBar.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');

        chrome.runtime.sendMessage({ action: "startTest" }, (response) => {
            if (chrome.runtime.lastError) {
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                startButton.disabled = false;
                cancelButton.classList.add('hidden');
                progressBar.classList.add('hidden');
                loadingIndicator.classList.add('hidden');
            } else if (response?.status) {
                // Ack received
            }
        });
    });

    // --- Cancel test ---
    cancelButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "cancelTest" });
        statusEl.textContent = 'Test cancelled.';
        startButton.disabled = false;
        cancelButton.classList.add('hidden');
        progressBar.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
    });

    // --- Listen for messages ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "testProgress") {
            const data = message.data;
            if (data.status) {
                statusEl.textContent = data.status;
                // Determine phase from status
                if (data.status.includes('Ping') || data.status.includes('Pong')) setSegment('ping');
                else if (data.status.includes('bits') || data.status.includes('Download')) setSegment('download');
                else if (data.status.includes('vibe') || data.status.includes('Upload')) setSegment('upload');
            }
            if (data.downloadSpeed !== undefined) {
                downloadSpeedEl.textContent = data.downloadSpeed.toFixed(2);
                setGauge(downloadGauge, data.downloadSpeed);
            }
            if (data.uploadSpeed !== undefined) {
                uploadSpeedEl.textContent = data.uploadSpeed.toFixed(2);
                setGauge(uploadGauge, data.uploadSpeed);
            }
            if (data.ping !== undefined) pingEl.textContent = data.ping.toFixed(1);
            if (data.jitter !== undefined) jitterEl.textContent = data.jitter.toFixed(1);
            if (data.packetLoss !== undefined) packetLossEl.textContent = data.packetLoss.toFixed(0);
        } else if (message.action === "testComplete") {
            const data = message.data;
            downloadSpeedEl.textContent = data.downloadSpeed !== undefined ? data.downloadSpeed.toFixed(2) : 'N/A';
            uploadSpeedEl.textContent = data.uploadSpeed !== undefined ? data.uploadSpeed.toFixed(2) : 'N/A';
            pingEl.textContent = data.ping !== undefined ? data.ping.toFixed(1) : 'N/A';
            jitterEl.textContent = data.jitter !== undefined ? data.jitter.toFixed(1) : 'N/A';
            packetLossEl.textContent = data.packetLoss !== undefined ? data.packetLoss.toFixed(0) : 'N/A';

            if (data.downloadSpeed !== undefined) setGauge(downloadGauge, data.downloadSpeed);
            if (data.uploadSpeed !== undefined) setGauge(uploadGauge, data.uploadSpeed);

            // Quality rating
            if (data.downloadSpeed !== undefined && data.uploadSpeed !== undefined && data.ping !== undefined) {
                const q = getQuality(data.downloadSpeed, data.uploadSpeed, data.ping);
                qualityBadge.textContent = q.label;
                qualityBadge.className = `quality-badge ${q.cls}`;
            }

            statusEl.textContent = data.status || "Test complete! 🎉";
            startButton.disabled = false;
            cancelButton.classList.add('hidden');
            progressBar.classList.add('hidden');
            loadingIndicator.classList.add('hidden');

            // Mark all segments done
            Object.values(segments).forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

            // Save to history
            saveHistory({
                timestamp: Date.now(),
                downloadSpeed: data.downloadSpeed,
                uploadSpeed: data.uploadSpeed,
                ping: data.ping,
                jitter: data.jitter,
                packetLoss: data.packetLoss,
            });
        } else if (message.action === "testError") {
            statusEl.textContent = `Error: ${message.error}`;
            if (downloadSpeedEl.textContent === '-') downloadSpeedEl.textContent = 'N/A';
            if (uploadSpeedEl.textContent === '-') uploadSpeedEl.textContent = 'N/A';
            if (pingEl.textContent === '-') pingEl.textContent = 'N/A';
            if (jitterEl.textContent === '-') jitterEl.textContent = 'N/A';
            if (packetLossEl.textContent === '-') packetLossEl.textContent = 'N/A';
            startButton.disabled = false;
            cancelButton.classList.add('hidden');
            progressBar.classList.add('hidden');
            loadingIndicator.classList.add('hidden');
        }
    });

    // --- History ---
    async function saveHistory(entry: HistoryEntry): Promise<void> {
        const result = await chrome.storage.local.get('history');
        const history: HistoryEntry[] = result.history || [];
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
        await chrome.storage.local.set({ history });
    }

    async function loadHistory(): Promise<HistoryEntry[]> {
        const result = await chrome.storage.local.get('history');
        return result.history || [];
    }

    function renderHistory(entries: HistoryEntry[]): void {
        if (entries.length === 0) {
            historyList.innerHTML = '<div class="history-item" style="justify-content:center;color:rgba(255,255,255,0.3)">No history yet</div>';
            return;
        }
        historyList.innerHTML = entries.map(e => {
            const date = new Date(e.timestamp);
            const timeStr = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
            const dl = e.downloadSpeed !== undefined ? e.downloadSpeed.toFixed(1) : '-';
            const ul = e.uploadSpeed !== undefined ? e.uploadSpeed.toFixed(1) : '-';
            return `<div class="history-item">
                <span class="time">${timeStr}</span>
                <span class="speeds">
                    <span class="dl">↓${dl}</span>
                    <span class="ul">↑${ul}</span>
                </span>
            </div>`;
        }).join('');
    }

    let historyVisible = false;
    historyToggle.addEventListener('click', async () => {
        historyVisible = !historyVisible;
        if (historyVisible) {
            const entries = await loadHistory();
            renderHistory(entries);
            historyList.classList.remove('hidden');
            historyToggle.textContent = 'Hide History';
        } else {
            historyList.classList.add('hidden');
            historyToggle.textContent = 'History';
        }
    });
});
