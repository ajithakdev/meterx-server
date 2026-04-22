/**
 * MeterX Popup UI — orchestrator. Heavy logic lives in sibling modules.
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { HistoryEntry } from '@meterx/shared';
import { fmt, getTimeAgo } from './format';
import { getQuality, scoreUseCases } from './quality';
import { loadHistory, loadAllHistory, saveHistory } from './history';
import { renderHistory } from './history';
import { exportPdfReport } from './export-pdf';
import { exportJson, exportCsv } from './export-data';
import { buildShareUrl } from './share';
import { renderSparkline } from './sparkline';
import { bindTooltips } from './tooltips';
import { loadIspPlan, renderIspComparison } from './isp';

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
    const exportMenu = document.getElementById('exportMenu') as HTMLElement | null;
    const exportBackdrop = document.getElementById('exportBackdrop') as HTMLElement | null;
    const closeBtn = $('closeBtn') as HTMLButtonElement;
    const settingsBtn = $('settingsBtn') as HTMLButtonElement;
    const shareBtn = document.getElementById('shareBtn') as HTMLButtonElement | null;
    const sparkEl = document.getElementById('sparkline') as HTMLElement | null;
    const ispCompareEl = document.getElementById('ispCompare') as HTMLElement | null;

    closeBtn.addEventListener('click', () => window.close());
    settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
    bindTooltips(document);

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
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * eased;
            heroSpeed.textContent = current.toFixed(1);
            if (progress < 1) countAnim = requestAnimationFrame(tick);
            else countAnim = null;
        }
        countAnim = requestAnimationFrame(tick);
    }

    function setBar(el: HTMLElement, speed: number): void {
        const pct = Math.min((speed / MAX_SPEED) * 100, 100);
        el.style.width = pct + '%';
        if (pct > 5) el.classList.add('glow');
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
        lineFills['dl-ul'].style.width = idx >= 1 ? '100%' : '0%';
        lineFills['ul-ping'].style.width = idx >= 2 ? '100%' : '0%';
        dlIcon.classList.toggle('active-pulse', phase === 'download');
        ulIcon.classList.toggle('active-pulse', phase === 'upload');
    }

    function applyUseCases(dl?: number, ul?: number, ping?: number, jitter?: number, loss?: number): void {
        if (dl === undefined || ul === undefined || ping === undefined) {
            useCases.classList.add('hidden');
            return;
        }
        const s = scoreUseCases(dl, ul, ping, jitter, loss);
        ucCalls.className = `uc ${s.calls}`;
        ucStream.className = `uc ${s.stream}`;
        ucGaming.className = `uc ${s.gaming}`;
        ucUpload.className = `uc ${s.upload}`;
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

    function checkOnline(): void {
        if (!navigator.onLine) { startButton.disabled = true; statusEl.textContent = 'No connection'; }
    }
    window.addEventListener('online', () => { startButton.disabled = false; statusEl.textContent = 'Connection restored'; });
    window.addEventListener('offline', () => { startButton.disabled = true; statusEl.textContent = 'No connection'; });
    checkOnline();

    async function refreshAuxiliaryViews(): Promise<void> {
        const all = await loadAllHistory();
        if (sparkEl) renderSparkline(sparkEl, all);
        if (ispCompareEl) {
            const plan = await loadIspPlan();
            renderIspComparison(ispCompareEl, all[0], plan);
        }
    }

    // --- Last-result restore on popup open ---
    (async () => {
        const history = await loadAllHistory();
        if (history.length > 0) {
            const last = history[0];
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
                applyUseCases(last.downloadSpeed, last.uploadSpeed, last.ping, last.jitter, last.packetLoss);
            }
            statusEl.textContent = `Last test: ${getTimeAgo(new Date(last.timestamp))}`;
        }
        await refreshAuxiliaryViews();
    })();

    startButton.addEventListener('click', () => {
        resetUI();
        setTesting(true);
        statusEl.textContent = 'Initializing...';
        chrome.runtime.sendMessage({ action: 'startTest' }, (response) => {
            if (chrome.runtime.lastError) {
                statusEl.textContent = `Error: ${chrome.runtime.lastError.message}`;
                setTesting(false);
            } else if (response?.status) { /* ack */ }
        });
    });

    cancelButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'cancelTest' });
        statusEl.textContent = 'Cancelled';
        setTesting(false);
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'testProgress') {
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
        } else if (message.action === 'testComplete') {
            const data = message.data;
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
            applyUseCases(data.downloadSpeed, data.uploadSpeed, data.ping, data.jitter, data.packetLoss);

            statusEl.textContent = data.status || 'Test complete';
            setTesting(false);
            Object.values(segments).forEach(s => { s.classList.remove('active'); s.classList.add('done'); });
            lineFills['dl-ul'].style.width = '100%';
            lineFills['ul-ping'].style.width = '100%';

            const entry: HistoryEntry = {
                timestamp: Date.now(),
                downloadSpeed: data.downloadSpeed,
                uploadSpeed: data.uploadSpeed,
                ping: data.ping,
                jitter: data.jitter,
                packetLoss: data.packetLoss,
                bufferbloatDelta: data.bufferbloatDelta,
                bufferbloatGrade: data.bufferbloatGrade,
                dnsLookupMs: data.dnsLookupMs,
                ipv4Ok: data.ipv4Ok,
                ipv6Ok: data.ipv6Ok,
                edge: data.edge,
            };
            saveHistory(entry).then(refreshAuxiliaryViews);
        } else if (message.action === 'testError') {
            statusEl.textContent = message.error || 'Test failed';
            setTesting(false);
        }
    });

    let historyOpen = false;
    historyToggle.addEventListener('click', async () => {
        historyOpen = !historyOpen;
        if (historyOpen) {
            const entries = await loadHistory();
            renderHistory(historyList, entries);
            historyList.classList.remove('hidden');
            historyLabel.textContent = 'Hide';
        } else {
            historyList.classList.add('hidden');
            historyLabel.textContent = 'History';
        }
    });

    // --- Export dispatch ---
    async function dispatchExport(kind: 'pdf' | 'json' | 'csv'): Promise<void> {
        const all = await loadAllHistory();
        if (all.length === 0) { statusEl.textContent = 'No data to export'; return; }
        try {
            if (kind === 'pdf') {
                statusEl.textContent = 'Generating report...';
                await exportPdfReport(all);
                statusEl.textContent = 'Report downloaded';
            } else if (kind === 'json') {
                exportJson(all);
                statusEl.textContent = 'JSON exported';
            } else {
                exportCsv(all);
                statusEl.textContent = 'CSV exported';
            }
        } catch (e) {
            statusEl.textContent = e instanceof Error ? `Export failed: ${e.message}` : 'Export failed';
        }
    }

    function closeExportMenu(): void {
        exportMenu?.classList.add('hidden');
        exportBackdrop?.classList.add('hidden');
    }
    function openExportMenu(): void {
        exportMenu?.classList.remove('hidden');
        exportBackdrop?.classList.remove('hidden');
        const first = exportMenu?.querySelector<HTMLElement>('[data-export]');
        first?.focus();
    }

    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (exportMenu) {
            if (exportMenu.classList.contains('hidden')) openExportMenu();
            else closeExportMenu();
        } else {
            dispatchExport('pdf');
        }
    });

    if (exportMenu) {
        exportMenu.querySelectorAll<HTMLElement>('[data-export]').forEach(el => {
            el.addEventListener('click', () => {
                const kind = el.dataset.export as 'pdf' | 'json' | 'csv';
                closeExportMenu();
                dispatchExport(kind);
            });
        });
        exportBackdrop?.addEventListener('click', closeExportMenu);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeExportMenu(); });
    }

    // --- Share ---
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const all = await loadAllHistory();
            const last = all[0];
            if (!last) { statusEl.textContent = 'No result to share'; return; }
            const url = buildShareUrl(last);
            try {
                await navigator.clipboard.writeText(url);
                statusEl.textContent = 'Share link copied';
            } catch {
                statusEl.textContent = url;
            }
        });
    }
});
