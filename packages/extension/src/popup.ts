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
const DL_RING_CIRCUMFERENCE = 534;  // 2 * PI * 85
const UL_RING_CIRCUMFERENCE = 490;  // 2 * PI * 78
const MAX_SPEED_GAUGE = 200;

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
    const btnText = startButton.querySelector('.btn-text') as HTMLElement;
    const btnSpinner = document.getElementById('btnSpinner') as HTMLElement;
    const downloadSpeedEl = document.getElementById('downloadSpeed') as HTMLElement;
    const uploadSpeedEl = document.getElementById('uploadSpeed') as HTMLElement;
    const pingEl = document.getElementById('ping') as HTMLElement;
    const jitterEl = document.getElementById('jitter') as HTMLElement;
    const packetLossEl = document.getElementById('packetLoss') as HTMLElement;
    const statusEl = document.getElementById('status') as HTMLElement;
    const heroSpeed = document.getElementById('heroSpeed') as HTMLElement;
    const heroUnit = document.querySelector('.hero-unit') as HTMLElement;
    const heroLabel = document.getElementById('heroLabel') as HTMLElement;
    const progressBar = document.getElementById('progress-bar') as HTMLElement;
    const qualityBadge = document.getElementById('quality-badge') as HTMLElement;
    const historyToggle = document.getElementById('historyToggle') as HTMLButtonElement;
    const historyList = document.getElementById('historyList') as HTMLElement;
    const heroGauge = document.querySelector('.hero-gauge') as HTMLElement;

    const dlRing = document.getElementById('downloadRing') as unknown as SVGCircleElement;
    const ulRing = document.getElementById('uploadRing') as unknown as SVGCircleElement;

    const segments = {
        download: document.getElementById('seg-download') as HTMLElement,
        upload: document.getElementById('seg-upload') as HTMLElement,
        ping: document.getElementById('seg-ping') as HTMLElement,
    };

    function setRing(el: SVGCircleElement, circumference: number, speedMbps: number): void {
        const ratio = Math.min(speedMbps / MAX_SPEED_GAUGE, 1);
        el.style.strokeDashoffset = String(circumference * (1 - ratio));
    }

    function resetRings(): void {
        dlRing.style.strokeDashoffset = String(DL_RING_CIRCUMFERENCE);
        ulRing.style.strokeDashoffset = String(UL_RING_CIRCUMFERENCE);
    }

    function setHero(value: string, unit: string, label: string): void {
        heroSpeed.textContent = value;
        heroUnit.textContent = unit;
        heroLabel.textContent = label;
    }

    function setSegment(phase: 'download' | 'upload' | 'ping'): void {
        const order: Array<'download' | 'upload' | 'ping'> = ['download', 'upload', 'ping'];
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

    function setTesting(active: boolean): void {
        startButton.disabled = active;
        cancelButton.classList.toggle('hidden', !active);
        progressBar.classList.toggle('hidden', !active);
        btnSpinner.classList.toggle('hidden', !active);
        heroGauge.classList.toggle('testing', active);
        if (active) {
            btnText.textContent = 'Testing';
        } else {
            btnText.textContent = 'Start Test';
        }
    }

    function resetUI(): void {
        downloadSpeedEl.textContent = '--';
        uploadSpeedEl.textContent = '--';
        pingEl.textContent = '--';
        jitterEl.textContent = '--';
        packetLossEl.textContent = '--';
        setHero('--', 'Mbps', 'download');
        qualityBadge.classList.add('hidden');
        qualityBadge.className = 'badge hidden';
        resetRings();
        Object.values(segments).forEach(s => { s.classList.remove('active', 'done'); });
    }

    // --- Offline detection ---
    function checkOnline(): void {
        if (!navigator.onLine) {
            startButton.disabled = true;
            statusEl.textContent = 'No connection detected';
        }
    }
    window.addEventListener('online', () => {
        startButton.disabled = false;
        statusEl.textContent = 'Connection restored';
    });
    window.addEventListener('offline', () => {
        startButton.disabled = true;
        statusEl.textContent = 'No connection detected';
    });
    checkOnline();

    // --- Start ---
    startButton.addEventListener('click', () => {
        resetUI();
        setTesting(true);
        statusEl.textContent = 'Initializing test...';

        chrome.runtime.sendMessage({ action: "startTest" }, (response) => {
            if (chrome.runtime.lastError) {
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                setTesting(false);
            } else if (response?.status) {
                // ack
            }
        });
    });

    // --- Cancel ---
    cancelButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "cancelTest" });
        statusEl.textContent = 'Test cancelled';
        setTesting(false);
    });

    // --- Messages ---
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "testProgress") {
            const data = message.data;
            if (data.status) {
                statusEl.textContent = data.status;
                if (data.status.includes('latency') || data.status.includes('Ping') || data.status.includes('Pong')) setSegment('ping');
                else if (data.status.includes('Download') || data.status.includes('download')) setSegment('download');
                else if (data.status.includes('Upload') || data.status.includes('upload')) setSegment('upload');
            }
            if (data.downloadSpeed !== undefined) {
                const val = data.downloadSpeed.toFixed(1);
                downloadSpeedEl.textContent = val;
                setHero(val, 'Mbps', 'download');
                setRing(dlRing, DL_RING_CIRCUMFERENCE, data.downloadSpeed);
            }
            if (data.uploadSpeed !== undefined) {
                const val = data.uploadSpeed.toFixed(1);
                uploadSpeedEl.textContent = val;
                setHero(val, 'Mbps', 'upload');
                setRing(ulRing, UL_RING_CIRCUMFERENCE, data.uploadSpeed);
            }
            if (data.ping !== undefined) {
                pingEl.textContent = data.ping.toFixed(1);
                setHero(data.ping.toFixed(0), 'ms', 'ping');
            }
            if (data.jitter !== undefined) jitterEl.textContent = data.jitter.toFixed(1);
            if (data.packetLoss !== undefined) packetLossEl.textContent = data.packetLoss.toFixed(0);
        } else if (message.action === "testComplete") {
            const data = message.data;
            const fmt = (v: number | undefined, dec: number) => v !== undefined ? v.toFixed(dec) : '--';

            downloadSpeedEl.textContent = fmt(data.downloadSpeed, 1);
            uploadSpeedEl.textContent = fmt(data.uploadSpeed, 1);
            pingEl.textContent = fmt(data.ping, 1);
            jitterEl.textContent = fmt(data.jitter, 1);
            packetLossEl.textContent = fmt(data.packetLoss, 0);

            if (data.downloadSpeed !== undefined) {
                setRing(dlRing, DL_RING_CIRCUMFERENCE, data.downloadSpeed);
                setHero(data.downloadSpeed.toFixed(1), 'Mbps', 'download');
            }
            if (data.uploadSpeed !== undefined) setRing(ulRing, UL_RING_CIRCUMFERENCE, data.uploadSpeed);

            // Quality
            if (data.downloadSpeed !== undefined && data.uploadSpeed !== undefined && data.ping !== undefined) {
                const q = getQuality(data.downloadSpeed, data.uploadSpeed, data.ping);
                qualityBadge.textContent = q.label;
                qualityBadge.className = `badge ${q.cls}`;
            }

            statusEl.textContent = data.status || 'Test complete';
            setTesting(false);
            Object.values(segments).forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

            saveHistory({
                timestamp: Date.now(),
                downloadSpeed: data.downloadSpeed,
                uploadSpeed: data.uploadSpeed,
                ping: data.ping,
                jitter: data.jitter,
                packetLoss: data.packetLoss,
            });
        } else if (message.action === "testError") {
            statusEl.textContent = message.error || 'Test failed';
            setTesting(false);
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
            historyList.innerHTML = '<div class="history-item" style="justify-content:center">No tests recorded yet</div>';
            return;
        }
        historyList.innerHTML = entries.map(e => {
            const date = new Date(e.timestamp);
            const timeStr = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
            const dl = e.downloadSpeed !== undefined ? e.downloadSpeed.toFixed(1) : '--';
            const ul = e.uploadSpeed !== undefined ? e.uploadSpeed.toFixed(1) : '--';
            return `<div class="history-item">
                <span class="time">${timeStr}</span>
                <span class="speeds">
                    <span class="dl">${dl}</span>
                    <span class="ul">${ul}</span>
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
        } else {
            historyList.classList.add('hidden');
        }
    });
});
