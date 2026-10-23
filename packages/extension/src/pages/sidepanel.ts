/**
 * Side panel: history, trend and the plan comparison. Also opens as a tab
 * on browsers without a side panel API.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { BroadcastMessage, HistoryEntry, IspPlan } from '@meterx/shared';
import { exportCsv, exportJson } from '../lib/export-data';
import { exportPdfReport } from '../lib/export-pdf';
import { fmt, fmtSpeed, fmtWhen } from '../lib/format';
import { loadHistory } from '../lib/history';
import { loadIspPlan, planShare } from '../lib/isp';
import { qualityOf } from '../lib/quality';
import { bindTooltips } from '../lib/tooltips';
import { MARK_SVG, bindMenu, scopeLine, setFigure } from '../lib/ui';
import { median } from '../background/measure';

interface ChartsApi {
    line(el: HTMLElement, opts: Record<string, unknown>): { legend: HTMLElement | null };
    fmt: { dec(d: number): (v: number) => string };
}
declare const Charts: ChartsApi;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const ROWS_COLLAPSED = 8;

let days = 7;
let showAll = false;
let running = false;

const avg = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : undefined);
const values = (rows: HistoryEntry[], k: 'downloadSpeed' | 'uploadSpeed' | 'ping') =>
    rows.map(r => r[k]).filter((v): v is number => v !== undefined);

function inRange(all: HistoryEntry[]): HistoryEntry[] {
    if (!days) return all;
    const since = Date.now() - days * 86_400_000;
    return all.filter(e => e.timestamp >= since);
}

function rangeWords(): string {
    return days === 1 ? 'in the last 24 hours' : days ? `in the last ${days} days` : 'in all saved results';
}

function finding(rows: HistoryEntry[], plan: IspPlan | null): string {
    const dl = values(rows, 'downloadSpeed');
    if (dl.length === 0) return `No tests ${rangeWords()}. Run one to start the history.`;
    const mean = avg(dl)!;
    const slowest = rows.reduce((a, b) => ((b.downloadSpeed ?? Infinity) < (a.downloadSpeed ?? Infinity) ? b : a));
    let s = `Download averaged ${fmtSpeed(mean)} Mbps over ${dl.length} test${dl.length === 1 ? '' : 's'} ${rangeWords()}`;
    const share = plan ? planShare(mean, plan.downloadMbps) : null;
    s += share !== null ? `, ${Math.round(share)}% of your ${plan!.downloadMbps} Mbps plan.` : '.';
    if (dl.length > 2 && slowest.downloadSpeed !== undefined && slowest.downloadSpeed < mean * 0.6) {
        s += ` Slowest: ${fmtSpeed(slowest.downloadSpeed)} Mbps, ${fmtWhen(slowest.timestamp).toLowerCase()}.`;
    }
    return s;
}

function renderChart(rows: HistoryEntry[], plan: IspPlan | null): void {
    const chart = $('chart');
    const pts = [...rows].reverse().slice(-120);
    const empty = pts.length < 2;
    chart.hidden = empty;
    $('chartEmpty').hidden = !empty;
    $('legend').replaceChildren();
    if (empty) return;
    const short = days === 1;
    const labels = pts.map(e => {
        const d = new Date(e.timestamp);
        return short ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
            : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    });
    const { legend } = Charts.line(chart, {
        labels,
        series: [
            { name: 'Download', values: pts.map(e => e.downloadSpeed ?? null) },
            { name: 'Upload', values: pts.map(e => e.uploadSpeed ?? null) },
        ],
        format: (v: number) => `${fmtSpeed(v)} Mbps`,
        tickFormat: (v: number) => String(Math.round(v)),
        height: 200,
        reference: plan && plan.downloadMbps > 0 ? { value: plan.downloadMbps, label: `Plan ${plan.downloadMbps}` } : undefined,
    });
    if (legend) $('legend').append(legend);
}

function renderPlan(rows: HistoryEntry[], plan: IspPlan | null): void {
    $('planEmpty').hidden = !!plan;
    $('planName').textContent = plan?.providerName ?? '';
    const box = $('planRows');
    box.hidden = !plan;
    if (!plan) return;
    const items = [
        { cls: 'down', label: 'Download', planned: plan.downloadMbps, got: avg(values(rows, 'downloadSpeed')) },
        { cls: 'up', label: 'Upload', planned: plan.uploadMbps, got: avg(values(rows, 'uploadSpeed')) },
    ].filter(i => i.planned > 0);
    box.innerHTML = items.map(i => {
        const share = planShare(i.got, i.planned);
        const scale = Math.max(i.planned, i.got ?? 0) * 1.05;
        const width = i.got === undefined ? 0 : (i.got / scale) * 100;
        return `<div class="plan-row ${i.cls}">
            <div class="top"><span>${i.label}</span><b>${fmtSpeed(i.got)} <span class="unit">of ${i.planned} Mbps</span></b></div>
            <div class="bar-track" aria-hidden="true"><i style="width:${width}%"></i><span class="target" style="left:calc(${(i.planned / scale) * 100}% - 1px)"></span></div>
            <div class="sub ${share !== null && share < 50 ? 'is-low' : ''}">${share === null ? 'No results in this range' : `${Math.round(share)}% of the advertised speed, on average`}</div>
        </div>`;
    }).join('');
}

function renderRows(rows: HistoryEntry[]): void {
    const shown = showAll ? rows : rows.slice(0, ROWS_COLLAPSED);
    $('rows').innerHTML = shown.map(e => {
        const q = qualityOf(e);
        return `<tr><td class="when">${fmtWhen(e.timestamp)}</td><td class="num down">${fmtSpeed(e.downloadSpeed)}</td>` +
            `<td class="num">${fmtSpeed(e.uploadSpeed)}</td><td class="num">${fmt(e.ping, 0)}</td>` +
            `<td>${q ? `<span class="pill q-${q.cls}">${q.label}</span>` : '<span class="dash">—</span>'}</td></tr>`;
    }).join('');
    $('rowsEmpty').hidden = rows.length > 0;
    const more = $<HTMLButtonElement>('moreBtn');
    more.hidden = rows.length <= ROWS_COLLAPSED;
    more.textContent = showAll ? 'Show fewer' : `Show all ${rows.length}`;
}

async function refresh(): Promise<void> {
    const [all, plan, { serverUrl }] = await Promise.all([loadHistory(), loadIspPlan(), chrome.storage.sync.get('serverUrl')]);
    const rows = inRange(all);
    $('scope').textContent = scopeLine(all[0], !!serverUrl);
    $('finding').textContent = finding(rows, plan);
    setFigure($('avgDown'), fmtSpeed(avg(values(rows, 'downloadSpeed'))));
    setFigure($('avgUp'), fmtSpeed(avg(values(rows, 'uploadSpeed'))));
    const pings = values(rows, 'ping');
    setFigure($('medPing'), pings.length ? fmt(median(pings), 0) : '—');
    $('count').textContent = String(rows.length);
    renderChart(rows, plan);
    renderPlan(rows, plan);
    renderRows(rows);
}

function setStatus(text: string, error = false): void {
    $('status').textContent = text;
    $('status').classList.toggle('is-error', error);
}

function setRunning(on: boolean): void {
    running = on;
    $('runBtn').textContent = on ? 'Stop test' : 'Run test';
}

document.addEventListener('DOMContentLoaded', async () => {
    $('mark').outerHTML = MARK_SVG;
    bindTooltips(document);
    await refresh();

    const state = await chrome.runtime.sendMessage({ action: 'getState' }).catch(() => null) as { running: boolean } | null;
    setRunning(!!state?.running);

    $('runBtn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: running ? 'cancelTest' : 'startTest' });
        if (!running) { setRunning(true); setStatus('Testing… about 20 seconds'); }
    });
    $('settingsBtn').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('planSetup').addEventListener('click', () => chrome.runtime.openOptionsPage());

    $('range').addEventListener('click', (ev) => {
        const tab = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-days]');
        if (!tab) return;
        days = Number(tab.dataset.days);
        showAll = false;
        $('range').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b === tab)));
        refresh();
    });
    $('moreBtn').addEventListener('click', () => { showAll = !showAll; refresh(); });

    bindMenu($<HTMLButtonElement>('exportBtn'), $('exportMenu'), async (kind) => {
        const all = await loadHistory();
        if (all.length === 0) { setStatus('Nothing to export yet'); return; }
        try {
            if (kind === 'pdf') { setStatus('Building the report…'); await exportPdfReport(all); }
            else if (kind === 'csv') exportCsv(all);
            else exportJson(all);
            setStatus(`${kind.toUpperCase()} saved`);
        } catch (e) {
            setStatus(e instanceof Error ? `Export failed: ${e.message}` : 'Export failed', true);
        }
    });

    chrome.runtime.onMessage.addListener((msg: BroadcastMessage) => {
        if (msg.action === 'testProgress' && !running) setRunning(true);
        if (msg.action === 'testComplete') { setRunning(false); setStatus(''); }
        if (msg.action === 'testError') { setRunning(false); setStatus(msg.cancelled ? '' : msg.error, !msg.cancelled); }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if ((area === 'local' && 'history' in changes) || (area === 'sync' && ('ispPlan' in changes || 'serverUrl' in changes))) refresh();
    });
});
