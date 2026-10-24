/**
 * Popup: run a test, see the latest result.
 * The service worker runs the test and saves history; this page only renders.
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import { buildShareUrl, type BroadcastMessage, type HistoryEntry, type Phase, type TestProgress } from '@meterx/shared';
import { openPanel, panelSupported } from '../lib/browser';
import { exportCsv, exportJson } from '../lib/export-data';
import { exportPdfReport } from '../lib/export-pdf';
import { NONE, fmt, fmtSpeed, getTimeAgo } from '../lib/format';
import { loadHistory } from '../lib/history';
import { loadIspPlan } from '../lib/isp';
import { bindTooltips } from '../lib/tooltips';
import { MARK_SVG, animatePhase, bindMenu, findingFor, renderLoad, renderReady, scopeLine, setFigure, setQualityPill } from '../lib/ui';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const els = {
    scope: $('scope'), download: $('download'), upload: $('upload'), ping: $('ping'), jitter: $('jitter'), loss: $('loss'),
    quality: $('quality'), finding: $('finding'), grade: $('grade'), loadRows: $('loadRows'), ready: $('ready'),
    progress: $('progress'), fill: $('progressFill'), run: $<HTMLButtonElement>('runBtn'), status: $('status'),
};

let running = false;
let phase: Phase | undefined;
let latest: HistoryEntry | undefined;
let customServer = false;

function setStatus(text: string, error = false): void {
    els.status.textContent = text;
    els.status.classList.toggle('is-error', error);
}

function restingStatus(): void {
    setStatus(latest ? `Last test ${getTimeAgo(new Date(latest.timestamp))}` : 'No tests yet');
}

function updateRunButton(): void {
    els.run.textContent = running ? 'Stop test' : 'Run test';
    // Stop stays available; Start needs a connection (#77).
    els.run.disabled = !running && !navigator.onLine;
}

async function renderResult(e: HistoryEntry | undefined): Promise<void> {
    setFigure(els.download, fmtSpeed(e?.downloadSpeed));
    setFigure(els.upload, fmtSpeed(e?.uploadSpeed));
    setFigure(els.ping, fmt(e?.ping, 0));
    setFigure(els.jitter, fmt(e?.jitter, 1));
    setFigure(els.loss, fmt(e?.packetLoss, 0));
    setQualityPill(els.quality, e);
    renderLoad(els.loadRows, els.grade, e);
    renderReady(els.ready, e);
    els.finding.textContent = findingFor(e, await loadIspPlan());
    els.scope.textContent = scopeLine(e, customServer);
}

function setPhase(p: Phase): void {
    if (p === phase) return;
    phase = p;
    const from = animatePhase(els.fill, p);
    if (from !== undefined) els.progress.setAttribute('aria-valuenow', String(from));
}

function setRunning(on: boolean): void {
    running = on;
    els.progress.classList.toggle('is-running', on);
    if (!on) phase = undefined;
    updateRunButton();
}

function applyProgress(p: TestProgress): void {
    if (p.phase) setPhase(p.phase);
    if (p.status) setStatus(`${p.status}…`);
    if (p.downloadSpeed !== undefined) setFigure(els.download, fmtSpeed(p.downloadSpeed));
    if (p.uploadSpeed !== undefined) setFigure(els.upload, fmtSpeed(p.uploadSpeed));
    if (p.ping !== undefined) { setFigure(els.ping, fmt(p.ping, 0)); renderLoad(els.loadRows, els.grade, { ping: p.ping }); }
    if (p.jitter !== undefined) setFigure(els.jitter, fmt(p.jitter, 1));
    if (p.packetLoss !== undefined) setFigure(els.loss, fmt(p.packetLoss, 0));
}

/** Clears figures at the start of a run, keeping every block where it is. */
function startView(): void {
    for (const el of [els.download, els.upload, els.ping, els.jitter, els.loss]) setFigure(el, NONE);
    setQualityPill(els.quality, undefined);
    renderLoad(els.loadRows, els.grade, undefined);
    renderReady(els.ready, undefined);
    els.finding.textContent = 'Measuring latency first, then download and upload. About 20 seconds.';
}

chrome.runtime.onMessage.addListener((msg: BroadcastMessage) => {
    if (msg.action === 'testProgress') {
        if (!running) { setRunning(true); startView(); }
        applyProgress(msg.data);
    } else if (msg.action === 'testComplete') {
        setRunning(false);
        latest = msg.data;
        renderResult(latest);
        setStatus('Test complete');
    } else if (msg.action === 'testError') {
        setRunning(false);
        renderResult(latest);
        if (msg.cancelled) restingStatus(); else setStatus(msg.error, true);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    $('mark').outerHTML = MARK_SVG;
    bindTooltips(document);

    customServer = !!(await chrome.storage.sync.get('serverUrl')).serverUrl;
    latest = (await loadHistory(1))[0];
    await renderResult(latest);
    restingStatus();

    // A test may already be running (scheduled, shortcut, or started before the popup closed).
    const state = await chrome.runtime.sendMessage({ action: 'getState' }).catch(() => null) as { running: boolean; progress: TestProgress } | null;
    if (state?.running) { setRunning(true); startView(); applyProgress(state.progress); }
    updateRunButton();
    if (!navigator.onLine) setStatus("You're offline", true);

    els.run.addEventListener('click', () => {
        if (running) { chrome.runtime.sendMessage({ action: 'cancelTest' }); return; }
        setRunning(true);
        startView();
        setStatus('Connecting…');
        chrome.runtime.sendMessage({ action: 'startTest' }).catch(() => {
            setRunning(false);
            setStatus("Couldn't start the test. Reopen MeterX and try again.", true);
        });
    });

    window.addEventListener('online', () => { updateRunButton(); if (!running) restingStatus(); });
    window.addEventListener('offline', () => { updateRunButton(); if (!running) setStatus("You're offline", true); });

    $('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('panelBtn').addEventListener('click', () => {
        if (panelSupported()) openPanel().then(() => window.close()).catch(() => chrome.tabs.create({ url: 'sidepanel.html' }));
        else chrome.tabs.create({ url: 'sidepanel.html' });
    });

    $('shareBtn').addEventListener('click', async () => {
        if (!latest) { setStatus('Run a test first, then share it'); return; }
        const url = buildShareUrl(latest);
        try {
            await navigator.clipboard.writeText(url);
            setStatus('Share link copied');
        } catch {
            chrome.tabs.create({ url });
        }
    });

    bindMenu($<HTMLButtonElement>('exportBtn'), $('exportMenu'), async (kind) => {
        const all = await loadHistory();
        if (all.length === 0) { setStatus('Nothing to export yet'); return; }
        try {
            if (kind === 'pdf') {
                setStatus('Building the report…');
                await exportPdfReport(all);
            } else if (kind === 'csv') exportCsv(all);
            else exportJson(all);
            setStatus(`${kind.toUpperCase()} saved`);
        } catch (e) {
            setStatus(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed', true);
        }
    });
});
