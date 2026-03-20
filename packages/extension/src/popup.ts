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

const MAX_HISTORY = 200; // ~30 days if testing ~7x/day
const HISTORY_DISPLAY = 7;
const MAX_SPEED = 200;

document.addEventListener('DOMContentLoaded', () => {
    const $ = (id: string) => document.getElementById(id) as HTMLElement;

    const startButton = $('startButton') as HTMLButtonElement;
    const cancelButton = $('cancelButton') as HTMLButtonElement;
    const btnText = startButton.querySelector('.btn-text') as HTMLElement;
    const btnSpinner = $('btnSpinner');
    const downloadSpeedEl = $('downloadSpeed');
    const uploadSpeedEl = $('uploadSpeed');
    const pingEl = $('ping');
    const jitterEl = $('jitter');
    const packetLossEl = $('packetLoss');
    const statusEl = $('status');
    const heroSpeed = $('heroSpeed');
    const heroLabel = $('heroLabel');
    const heroSection = $('heroSection');
    const speedDisplay = document.querySelector('.speed-display') as HTMLElement;
    const progressBar = $('progress-bar');
    const qualityBadge = $('quality-badge');
    const historyToggle = $('historyToggle') as HTMLButtonElement;
    const historyLabel = $('historyLabel');
    const historyList = $('historyList');
    const dlBar = $('dlBar');
    const ulBar = $('ulBar');
    const dlIcon = document.querySelector('.dl-icon') as HTMLElement;
    const ulIcon = document.querySelector('.ul-icon') as HTMLElement;
    const useCases = $('use-cases');
    const ucCalls = $('uc-calls');
    const ucStream = $('uc-stream');
    const ucGaming = $('uc-gaming');
    const ucUpload = $('uc-upload');
    const exportBtn = $('exportBtn') as HTMLButtonElement;
    const closeBtn = $('closeBtn') as HTMLButtonElement;

    const settingsBtn = $('settingsBtn') as HTMLButtonElement;

    // --- Close button ---
    closeBtn.addEventListener('click', () => window.close());

    // --- Settings button ---
    settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    const segments = {
        download: $('seg-download'),
        upload: $('seg-upload'),
        ping: $('seg-ping'),
    };

    const lineFills = {
        'dl-ul': $('line-dl-ul'),
        'ul-ping': $('line-ul-ping'),
    };

    // --- Animated number counting ---
    let countAnim: number | null = null;
    function animateHeroTo(target: number, duration = 400): void {
        if (countAnim) cancelAnimationFrame(countAnim);
        const start = parseFloat(heroSpeed.textContent || '0') || 0;
        const startTime = performance.now();
        function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * eased;
            heroSpeed.textContent = current.toFixed(1);
            if (progress < 1) {
                countAnim = requestAnimationFrame(tick);
            } else {
                countAnim = null;
            }
        }
        countAnim = requestAnimationFrame(tick);
    }

    function setBar(el: HTMLElement, speed: number): void {
        const pct = Math.min((speed / MAX_SPEED) * 100, 100);
        el.style.width = pct + '%';
        // Add glow when bar has meaningful width
        if (pct > 5) {
            el.classList.add('glow');
        }
    }

    function setHero(value: number, label: string): void {
        animateHeroTo(value);
        heroLabel.textContent = label;
    }

    function setHeroText(text: string, label: string): void {
        if (countAnim) { cancelAnimationFrame(countAnim); countAnim = null; }
        heroSpeed.textContent = text;
        heroLabel.textContent = label;
    }

    function setSegment(phase: 'download' | 'upload' | 'ping'): void {
        const order: Array<'download' | 'upload' | 'ping'> = ['download', 'upload', 'ping'];
        const idx = order.indexOf(phase);
        order.forEach((seg, i) => {
            segments[seg].classList.toggle('active', i === idx);
            segments[seg].classList.toggle('done', i < idx);
        });
        // Animate connecting lines: fill the line before the active segment
        lineFills['dl-ul'].style.width = idx >= 1 ? '100%' : '0%';
        lineFills['ul-ping'].style.width = idx >= 2 ? '100%' : '0%';
        // Pulse the active bar icon
        dlIcon.classList.toggle('active-pulse', phase === 'download');
        ulIcon.classList.toggle('active-pulse', phase === 'upload');
    }

    function getQuality(dl: number, ul: number, ping: number): { label: string; cls: string } {
        if (dl >= 50 && ul >= 20 && ping < 30) return { label: 'Excellent', cls: 'excellent' };
        if (dl >= 20 && ul >= 10 && ping < 60) return { label: 'Good', cls: 'good' };
        if (dl >= 5 && ul >= 2 && ping < 150) return { label: 'Fair', cls: 'fair' };
        return { label: 'Poor', cls: 'poor' };
    }

    function getQualityClass(dl?: number, ul?: number, ping?: number): string {
        if (dl === undefined || ul === undefined || ping === undefined) return 'q-fair';
        const q = getQuality(dl, ul, ping);
        return 'q-' + q.cls;
    }

    function scoreUseCases(dl?: number, ul?: number, ping?: number, jitter?: number, loss?: number): void {
        if (dl === undefined || ul === undefined || ping === undefined) {
            useCases.classList.add('hidden');
            return;
        }
        const j = jitter ?? 999;
        const l = loss ?? 100;

        // Video Calls: DL>=5, UL>=3, ping<100, jitter<30
        const calls = (dl >= 5 && ul >= 3 && ping < 100 && j < 30) ? 'good'
            : (dl >= 2 && ul >= 1 && ping < 200) ? 'okay' : 'poor';

        // Streaming: DL>=25 (4K), >=5 (HD)
        const stream = dl >= 25 ? 'good' : dl >= 5 ? 'okay' : 'poor';

        // Gaming: ping<50, jitter<20, loss<1%
        const gaming = (ping < 50 && j < 20 && l < 1) ? 'good'
            : (ping < 100 && j < 40 && l < 3) ? 'okay' : 'poor';

        // Uploads: UL>=10
        const upload = ul >= 10 ? 'good' : ul >= 3 ? 'okay' : 'poor';

        ucCalls.className = `uc ${calls}`;
        ucStream.className = `uc ${stream}`;
        ucGaming.className = `uc ${gaming}`;
        ucUpload.className = `uc ${upload}`;
        useCases.classList.remove('hidden');
    }

    function setTesting(active: boolean): void {
        startButton.disabled = active;
        cancelButton.classList.toggle('hidden', !active);
        progressBar.classList.toggle('hidden', !active);
        btnSpinner.classList.toggle('hidden', !active);
        heroSection.classList.toggle('testing', active);
        btnText.textContent = active ? 'Testing' : 'Start Test';
        if (!active) {
            dlIcon.classList.remove('active-pulse');
            ulIcon.classList.remove('active-pulse');
        }
    }

    function resetUI(): void {
        downloadSpeedEl.textContent = '--';
        uploadSpeedEl.textContent = '--';
        pingEl.textContent = '--';
        jitterEl.textContent = '--';
        packetLossEl.textContent = '--';
        setHeroText('--', 'download');
        dlBar.style.width = '0%';
        ulBar.style.width = '0%';
        dlBar.classList.remove('glow');
        ulBar.classList.remove('glow');
        downloadSpeedEl.classList.remove('has-val');
        uploadSpeedEl.classList.remove('has-val');
        speedDisplay.classList.remove('has-result');
        qualityBadge.classList.add('hidden');
        qualityBadge.className = 'badge hidden';
        useCases.classList.add('hidden');
        Object.values(segments).forEach(s => { s.classList.remove('active', 'done'); });
        lineFills['dl-ul'].style.width = '0%';
        lineFills['ul-ping'].style.width = '0%';
    }

    // --- Offline ---
    function checkOnline(): void {
        if (!navigator.onLine) { startButton.disabled = true; statusEl.textContent = 'No connection'; }
    }
    window.addEventListener('online', () => { startButton.disabled = false; statusEl.textContent = 'Connection restored'; });
    window.addEventListener('offline', () => { startButton.disabled = true; statusEl.textContent = 'No connection'; });
    checkOnline();

    // --- Load last result on startup ---
    (async () => {
        const result = await chrome.storage.local.get('history');
        const history: HistoryEntry[] = result.history || [];
        if (history.length > 0) {
            const last = history[0];
            const fmt = (v: number | undefined, d: number) => v !== undefined ? v.toFixed(d) : '--';
            downloadSpeedEl.textContent = fmt(last.downloadSpeed, 1);
            uploadSpeedEl.textContent = fmt(last.uploadSpeed, 1);
            pingEl.textContent = fmt(last.ping, 1);
            jitterEl.textContent = fmt(last.jitter, 1);
            packetLossEl.textContent = fmt(last.packetLoss, 0);

            if (last.downloadSpeed !== undefined) {
                setHeroText(last.downloadSpeed.toFixed(1), 'download');
                setBar(dlBar, last.downloadSpeed);
                downloadSpeedEl.classList.add('has-val');
                speedDisplay.classList.add('has-result');
            }
            if (last.uploadSpeed !== undefined) {
                setBar(ulBar, last.uploadSpeed);
                uploadSpeedEl.classList.add('has-val');
            }
            if (last.downloadSpeed !== undefined && last.uploadSpeed !== undefined && last.ping !== undefined) {
                const q = getQuality(last.downloadSpeed, last.uploadSpeed, last.ping);
                qualityBadge.textContent = q.label;
                qualityBadge.className = `badge ${q.cls}`;
                scoreUseCases(last.downloadSpeed, last.uploadSpeed, last.ping, last.jitter, last.packetLoss);
            }

            const d = new Date(last.timestamp);
            const timeAgo = getTimeAgo(d);
            statusEl.textContent = `Last test: ${timeAgo}`;
        }
    })();

    function getTimeAgo(date: Date): string {
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    // --- Start ---
    startButton.addEventListener('click', () => {
        resetUI();
        setTesting(true);
        statusEl.textContent = 'Initializing...';
        chrome.runtime.sendMessage({ action: "startTest" }, (response) => {
            if (chrome.runtime.lastError) {
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                setTesting(false);
            } else if (response?.status) { /* ack */ }
        });
    });

    // --- Cancel ---
    cancelButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "cancelTest" });
        statusEl.textContent = 'Cancelled';
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
                downloadSpeedEl.textContent = data.downloadSpeed.toFixed(1);
                downloadSpeedEl.classList.add('has-val');
                setHero(data.downloadSpeed, 'download');
                setBar(dlBar, data.downloadSpeed);
            }
            if (data.uploadSpeed !== undefined) {
                uploadSpeedEl.textContent = data.uploadSpeed.toFixed(1);
                uploadSpeedEl.classList.add('has-val');
                setHero(data.uploadSpeed, 'upload');
                setBar(ulBar, data.uploadSpeed);
            }
            if (data.ping !== undefined) {
                pingEl.textContent = data.ping.toFixed(1);
                setHero(data.ping, 'ping');
            }
            if (data.jitter !== undefined) jitterEl.textContent = data.jitter.toFixed(1);
            if (data.packetLoss !== undefined) packetLossEl.textContent = data.packetLoss.toFixed(0);
        } else if (message.action === "testComplete") {
            const data = message.data;
            const fmt = (v: number | undefined, d: number) => v !== undefined ? v.toFixed(d) : '--';
            downloadSpeedEl.textContent = fmt(data.downloadSpeed, 1);
            uploadSpeedEl.textContent = fmt(data.uploadSpeed, 1);
            pingEl.textContent = fmt(data.ping, 1);
            jitterEl.textContent = fmt(data.jitter, 1);
            packetLossEl.textContent = fmt(data.packetLoss, 0);

            if (data.downloadSpeed !== undefined) {
                setBar(dlBar, data.downloadSpeed);
                setHero(data.downloadSpeed, 'download');
                downloadSpeedEl.classList.add('has-val');
                speedDisplay.classList.add('has-result');
            }
            if (data.uploadSpeed !== undefined) {
                setBar(ulBar, data.uploadSpeed);
                uploadSpeedEl.classList.add('has-val');
            }

            if (data.downloadSpeed !== undefined && data.uploadSpeed !== undefined && data.ping !== undefined) {
                const q = getQuality(data.downloadSpeed, data.uploadSpeed, data.ping);
                qualityBadge.textContent = q.label;
                qualityBadge.className = `badge ${q.cls}`;
            }

            // Use-case readiness
            scoreUseCases(data.downloadSpeed, data.uploadSpeed, data.ping, data.jitter, data.packetLoss);

            statusEl.textContent = data.status || 'Test complete';
            setTesting(false);
            Object.values(segments).forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
            lineFills['dl-ul'].style.width = '100%';
            lineFills['ul-ping'].style.width = '100%';

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
        return (result.history || []).slice(0, HISTORY_DISPLAY);
    }

    function renderHistory(entries: HistoryEntry[]): void {
        if (entries.length === 0) {
            historyList.innerHTML = '<div class="history-item" style="justify-content:center;color:var(--t3)">No tests yet</div>';
            return;
        }
        historyList.innerHTML = entries.map(e => {
            const d = new Date(e.timestamp);
            const t = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
            const dl = e.downloadSpeed !== undefined ? e.downloadSpeed.toFixed(1) : '--';
            const ul = e.uploadSpeed !== undefined ? e.uploadSpeed.toFixed(1) : '--';
            const qClass = getQualityClass(e.downloadSpeed, e.uploadSpeed, e.ping);
            return `<div class="history-item">
                <span class="h-left"><span class="quality-dot ${qClass}"></span><span class="time">${t}</span></span>
                <span class="speeds"><span class="dl">${dl}</span><span class="ul">${ul}</span></span>
            </div>`;
        }).join('');
    }

    let historyOpen = false;
    historyToggle.addEventListener('click', async () => {
        historyOpen = !historyOpen;
        if (historyOpen) {
            const entries = await loadHistory();
            renderHistory(entries);
            historyList.classList.remove('hidden');
            historyLabel.textContent = 'Hide';
        } else {
            historyList.classList.add('hidden');
            historyLabel.textContent = 'History';
        }
    });

    // --- Report Export (HTML -> Print-to-PDF) ---
    exportBtn.addEventListener('click', async () => {
        const result = await chrome.storage.local.get('history');
        const hist: HistoryEntry[] = result.history || [];
        if (hist.length === 0) { statusEl.textContent = 'No data to export'; return; }

        statusEl.textContent = 'Generating report...';

        const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
        const mn = (a: number[]) => a.length ? Math.min(...a) : 0;
        const mx = (a: number[]) => a.length ? Math.max(...a) : 0;
        const sd = (a: number[]) => { const m = avg(a); return Math.sqrt(avg(a.map(v => (v - m) ** 2))); };

        const dlV = hist.filter(e => e.downloadSpeed !== undefined).map(e => e.downloadSpeed!);
        const ulV = hist.filter(e => e.uploadSpeed !== undefined).map(e => e.uploadSpeed!);
        const piV = hist.filter(e => e.ping !== undefined).map(e => e.ping!);
        const jiV = hist.filter(e => e.jitter !== undefined).map(e => e.jitter!);
        const loV = hist.filter(e => e.packetLoss !== undefined).map(e => e.packetLoss!);

        const aDl = avg(dlV), aUl = avg(ulV), aPi = avg(piV), aJi = avg(jiV), aLo = avg(loV);
        const qual = getQuality(aDl, aUl, aPi);
        const cons = dlV.length > 1 ? Math.max(0, Math.min(100, 100 - (sd(dlV) / aDl) * 100)) : 100;
        const consLabel = cons >= 85 ? 'Stable' : cons >= 70 ? 'Moderate' : cons >= 50 ? 'Unstable' : 'Very unstable';
        const anomThresh = aDl * 0.5;
        const anomCount = dlV.filter(v => v < anomThresh).length;
        const halfIdx = Math.floor(dlV.length / 2);
        const trendPct = avg(dlV.slice(halfIdx)) > 0 ? ((avg(dlV.slice(0, halfIdx)) - avg(dlV.slice(halfIdx))) / avg(dlV.slice(halfIdx))) * 100 : 0;
        const trendLabel = Math.abs(trendPct) < 5 ? 'Stable' : trendPct > 0 ? `Improving (+${trendPct.toFixed(0)}%)` : `Declining (${trendPct.toFixed(0)}%)`;

        const now = new Date();
        const oldest = new Date(hist[hist.length - 1].timestamp);
        const newest = new Date(hist[0].timestamp);
        const spanMin = Math.floor((newest.getTime() - oldest.getTime()) / 60000);
        const period = spanMin < 60 ? `${spanMin} min session` : spanMin < 1440 ? `${Math.floor(spanMin / 60)} hour session` : `${Math.floor(spanMin / 1440)} days`;

        const qCol = qual.cls === 'excellent' ? '#34d399' : qual.cls === 'good' ? '#60a5fa' : qual.cls === 'fair' ? '#fbbf24' : '#f87171';
        const consCol = cons >= 85 ? '#34d399' : cons >= 70 ? '#fbbf24' : '#f87171';
        const trendCol = Math.abs(trendPct) < 5 ? '#8888a0' : trendPct > 0 ? '#34d399' : '#f87171';

        const conn = (navigator as unknown as { connection?: { type?: string; effectiveType?: string } }).connection;
        const envParts: string[] = [];
        if (conn?.type && conn.type !== 'unknown') envParts.push(`Connection: ${({ wifi: 'WiFi', ethernet: 'Ethernet', cellular: 'Cellular' } as Record<string, string>)[conn.type] || conn.type}`);
        if (conn?.effectiveType) envParts.push(`Speed tier: ${conn.effectiveType.toUpperCase()}`);

        const gamSub = aPi < 50 ? 'Competitive OK' : aPi < 100 ? 'Casual only' : 'Not recommended';
        const ucData = [
            { l: 'Video Calls', s: 'Zoom, Meet, Teams', sc: (aDl >= 5 && aUl >= 3 && aPi < 100 && aJi < 30) ? 'Good' : (aDl >= 2 && aUl >= 1) ? 'Moderate' : 'Poor' },
            { l: '4K Streaming', s: 'Netflix, YouTube', sc: aDl >= 25 ? 'Good' : aDl >= 5 ? 'HD only' : 'Poor' },
            { l: 'Gaming', s: gamSub, sc: (aPi < 50 && aJi < 20 && aLo < 1) ? 'Good' : aPi < 100 ? 'Moderate' : 'Poor' },
            { l: 'Uploads', s: 'Cloud sync, files', sc: aUl >= 10 ? 'Good' : aUl >= 3 ? 'Moderate' : 'Poor' },
        ];

        const ucColor = (sc: string) => sc === 'Good' ? '#34d399' : sc === 'Poor' ? '#f87171' : '#fbbf24';
        const ucBg = (sc: string) => sc === 'Good' ? '#0d1f17' : sc === 'Poor' ? '#1f0d0d' : '#1f1a0d';

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>MeterX Network Health Report</title>
<style>
@media print {
  @page { size: A4; margin: 12mm; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0c0c14; color: #e8e8e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.5; padding: 32px; min-height: 100vh; }
.accent-bar { height: 4px; background: linear-gradient(90deg, #00c8ff, #a855f7); border-radius: 2px; margin-bottom: 24px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header h1 { font-size: 22px; color: #00c8ff; font-weight: 700; }
.header .meta { text-align: right; color: #555570; font-size: 10px; }
.card { background: #151520; border: 1px solid #1e1e2e; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
.quality-hero { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.quality-hero .qlabel { font-size: 36px; font-weight: 800; }
.quality-hero .qsub { color: #8888a0; font-size: 12px; margin-top: 4px; }
.quality-hero .right { text-align: right; font-size: 10px; line-height: 1.8; }
.env { color: #555570; font-size: 10px; margin-bottom: 12px; }
.divider { border: none; border-top: 1px solid #1e1e2e; margin: 16px 0; }
.metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.metric-card { background: #151520; border: 1px solid #1e1e2e; border-radius: 8px; padding: 16px; }
.metric-card .lbl { color: #555570; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.metric-card .val { font-size: 32px; font-weight: 800; line-height: 1.1; }
.metric-card .unit { color: #8888a0; font-size: 12px; margin-top: 4px; }
.metric-card .range { color: #555570; font-size: 9px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #1e1e2e; }
.sec-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.sec-card { background: #151520; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
.sec-card .lbl { color: #555570; font-size: 9px; text-transform: uppercase; }
.sec-card .val { font-size: 16px; font-weight: 700; color: #e8e8e8; }
.sec-card .range { color: #555570; font-size: 9px; }
.sec-card .no-loss { color: #34d399; font-size: 9px; font-weight: 600; }
h2 { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #e8e8e8; }
.uc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.uc-card { border-radius: 8px; padding: 14px; border: 1px solid; }
.uc-card .name { font-size: 9px; color: #8888a0; margin-bottom: 6px; }
.uc-card .score { font-size: 16px; font-weight: 700; }
.uc-card .sub { font-size: 8px; color: #555570; margin-top: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
thead th { background: #16162a; color: #00c8ff; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; padding: 8px 10px; text-align: left; }
thead th:first-child { border-radius: 6px 0 0 6px; }
thead th:last-child { border-radius: 0 6px 6px 0; }
tbody tr { border-bottom: 1px solid #1a1a2a; }
tbody tr:nth-child(even) { background: #10101c; }
tbody tr.anomaly { background: #140a0a; }
tbody tr.anomaly td:first-child { border-left: 2px solid #f87171; padding-left: 8px; }
tbody td { padding: 6px 10px; color: #8888a0; }
.dl { color: #00c8ff; } .ul { color: #a855f7; } .pi { color: #34d399; }
.anom-dl { color: #f87171 !important; } .anom-dt { color: #ff6b6b !important; }
.badge-anom { background: #f87171; color: #fff; font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block; }
.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(35deg); font-size: 100px; font-weight: 800; color: rgba(255,255,255,0.015); pointer-events: none; z-index: -1; letter-spacing: 0.1em; }
</style></head><body>
<div class="watermark">MeterX</div>
<div class="accent-bar"></div>

<div class="header">
  <h1>Network Health Report</h1>
  <div class="meta">
    ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}<br>
    ${period} &middot; ${hist.length} tests
  </div>
</div>

<div class="card">
  <div class="quality-hero">
    <div>
      <div class="qlabel" style="color:${qCol}">${qual.label}</div>
      <div class="qsub">Network Quality</div>
    </div>
    <div class="right">
      <div style="color:${consCol};font-weight:700">${cons.toFixed(0)}% stable (${consLabel})</div>
      <div style="color:#555570">Based on download speed variation</div>
      <div style="color:${trendCol}">Trend: ${trendLabel}</div>
      ${anomCount > 0
            ? `<div style="color:#f87171;font-weight:700">${anomCount} anomal${anomCount === 1 ? 'y' : 'ies'} &mdash; DL dropped below ${anomThresh.toFixed(0)} Mbps</div>`
            : '<div style="color:#34d399">No anomalies detected</div>'}
    </div>
  </div>
</div>

${envParts.length > 0 ? `<div class="env">${envParts.join(' &middot; ')}</div>` : ''}

<hr class="divider">
<div class="metrics">
  ${[{ l: 'Download', a: aDl, lo: mn(dlV), hi: mx(dlV), u: 'Mbps', c: '#00c8ff' },
            { l: 'Upload', a: aUl, lo: mn(ulV), hi: mx(ulV), u: 'Mbps', c: '#a855f7' },
            { l: 'Ping', a: aPi, lo: mn(piV), hi: mx(piV), u: 'ms', c: '#34d399' }]
            .map(m => `<div class="metric-card">
      <div class="lbl">${m.l}</div>
      <div class="val" style="color:${m.c}">${m.a.toFixed(1)}</div>
      <div class="unit">${m.u}</div>
      <div class="range">Range: ${m.lo.toFixed(1)} &ndash; ${m.hi.toFixed(1)}</div>
    </div>`).join('')}
</div>

<div class="sec-metrics">
  <div class="sec-card">
    <div><div class="lbl">Jitter</div><div class="val">${aJi.toFixed(1)} ms</div></div>
    <div class="range">Range: ${mn(jiV).toFixed(1)} &ndash; ${mx(jiV).toFixed(1)}</div>
  </div>
  <div class="sec-card">
    <div><div class="lbl">Packet Loss</div><div class="val">${aLo.toFixed(1)} %</div></div>
    ${mn(loV) === mx(loV) && aLo === 0 ? '<div class="no-loss">No loss detected</div>' : `<div class="range">Range: ${mn(loV).toFixed(1)} &ndash; ${mx(loV).toFixed(1)}</div>`}
  </div>
</div>

<hr class="divider">
<h2>Use-Case Assessment</h2>
<div class="uc-grid">
  ${ucData.map(c => `<div class="uc-card" style="background:${ucBg(c.sc)};border-color:${ucColor(c.sc)}">
    <div class="name">${c.l}</div>
    <div class="score" style="color:${ucColor(c.sc)}">${c.sc}</div>
    <div class="sub">${c.s}</div>
  </div>`).join('')}
</div>

<hr class="divider">
<h2>Test History</h2>
<table>
  <thead><tr><th>Date / Time</th><th>DL (Mbps)</th><th>UL (Mbps)</th><th>Ping (ms)</th><th>Jitter (ms)</th><th>Loss (%)</th><th></th></tr></thead>
  <tbody>
    ${hist.map(e => {
            const d = new Date(e.timestamp);
            const dt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            const isA = e.downloadSpeed !== undefined && e.downloadSpeed < anomThresh;
            return `<tr class="${isA ? 'anomaly' : ''}">
      <td class="${isA ? 'anom-dt' : ''}">${dt}</td>
      <td class="${isA ? 'anom-dl' : 'dl'}">${e.downloadSpeed !== undefined ? e.downloadSpeed.toFixed(1) : '-'}</td>
      <td class="ul">${e.uploadSpeed !== undefined ? e.uploadSpeed.toFixed(1) : '-'}</td>
      <td class="pi">${e.ping !== undefined ? e.ping.toFixed(1) : '-'}</td>
      <td>${e.jitter !== undefined ? e.jitter.toFixed(1) : '-'}</td>
      <td>${e.packetLoss !== undefined ? e.packetLoss.toFixed(0) : '-'}</td>
      <td>${isA ? '<span class="badge-anom">ANOMALY</span>' : ''}</td>
    </tr>`;
        }).join('')}
  </tbody>
</table>

</body></html>`;

        // Render HTML to hidden container, capture with html2canvas, save as PDF
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;';
        container.innerHTML = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '');

        // Inject styles into container + override body padding as container padding
        const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
        if (styleMatch) {
            const styleEl = document.createElement('style');
            styleEl.textContent = styleMatch[1];
            container.prepend(styleEl);
        }
        // Apply body-level styles directly to container
        container.style.background = '#0c0c14';
        container.style.padding = '30px 40px';
        container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        container.style.fontSize = '11px';
        container.style.lineHeight = '1.5';
        container.style.color = '#e8e8e8';

        document.body.appendChild(container);

        try {
            const { default: html2canvas } = await import('html2canvas');
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(container, {
                backgroundColor: '#0c0c14',
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
                foreignObjectRendering: false,
            });

            const pdfW = 210; // A4 width mm
            const pdfH = 297; // A4 height mm
            const margin = 8; // mm margin on each side
            const contentW = pdfW - margin * 2;

            const footerH = 12; // mm reserved for footer
            const contHeaderH = 10; // mm reserved for "continued" header on page 2+
            const page1ContentH = pdfH - margin * 2 - footerH;
            const pageNContentH = pdfH - margin * 2 - footerH - contHeaderH;
            const scaleFactor = canvas.width / contentW;
            const slice1H = page1ContentH * scaleFactor;
            const sliceNH = pageNContentH * scaleFactor;

            // Calculate total pages
            let remaining = canvas.height - slice1H;
            let totalPages = 1;
            while (remaining > 0) { totalPages++; remaining -= sliceNH; }

            const doc = new jsPDF('p', 'mm', 'a4');
            let srcOffset = 0;
            for (let p = 0; p < totalPages; p++) {
                if (p > 0) doc.addPage();
                doc.setFillColor('#0c0c14');
                doc.rect(0, 0, pdfW, pdfH, 'F');

                const isFirst = p === 0;
                const maxSlice = isFirst ? slice1H : sliceNH;
                const topOffset = isFirst ? margin : margin + contHeaderH;
                const srcH = Math.min(maxSlice, canvas.height - srcOffset);
                const destH = srcH / scaleFactor;

                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = srcH;
                const ctx = pageCanvas.getContext('2d')!;
                ctx.fillStyle = '#0c0c14';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                ctx.drawImage(canvas, 0, srcOffset, canvas.width, srcH, 0, 0, canvas.width, srcH);

                doc.addImage(
                    pageCanvas.toDataURL('image/png'),
                    'PNG', margin, topOffset, contentW, destH,
                    undefined, 'FAST'
                );
                srcOffset += srcH;
            }

            // Draw footer + continuation header on every page
            const footerY = pdfH - margin - 4;
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                // Footer
                doc.setDrawColor('#1e1e2e');
                doc.line(margin, footerY - 4, pdfW - margin, footerY - 4);
                doc.setFontSize(7);
                doc.setTextColor('#555570');
                doc.text('github.com/ajithakdev/meterx-server  |  v2026.0.319  |  MIT License', pdfW / 2, footerY, { align: 'center' });
                doc.setTextColor('#8888a0');
                doc.text(`${p} / ${totalPages}`, pdfW - margin, footerY, { align: 'right' });
                // Continuation header on page 2+
                if (p > 1) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor('#e8e8e8');
                    doc.text('Test History (continued)', margin, margin + 6);
                    doc.setFont('helvetica', 'normal');
                }
            }

            doc.save(`MeterX-Report-${now.toLocaleDateString('en-CA')}.pdf`);
            statusEl.textContent = 'Report downloaded';
        } catch {
            statusEl.textContent = 'Export failed — try again';
        } finally {
            document.body.removeChild(container);
        }
    });
});
