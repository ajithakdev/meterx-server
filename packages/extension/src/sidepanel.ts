/**
 * MeterX Side Panel — persistent dashboard next to the browser tab.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import { loadAllHistory, loadHistory, renderHistory } from './history';
import { renderIspComparison, loadIspPlan } from './isp';
import { getQuality } from './quality';
import { fmt } from './format';
import { bindTooltips } from './tooltips';
import { renderChart } from './chart';

document.addEventListener('DOMContentLoaded', async () => {
    const $ = (id: string) => document.getElementById(id) as HTMLElement;
    const heroNum = $('heroNum');
    const heroUp = $('heroUp');
    const heroPing = $('heroPing');
    const heroBB = $('heroBB');
    const qualityBadge = $('quality-badge');
    const chartEl = $('chart');
    const historyListEl = $('historyList');
    const ispEl = $('ispCompare');
    const ispEmpty = $('ispEmpty');
    const startBtn = $('startButton');
    const optionsBtn = $('openOptions');

    bindTooltips(document);

    async function refresh(): Promise<void> {
        const all = await loadAllHistory();
        const last = all[0];

        heroNum.textContent = fmt(last?.downloadSpeed, 1);
        heroUp.textContent  = fmt(last?.uploadSpeed, 1);
        heroPing.textContent = fmt(last?.ping, 1);
        heroBB.textContent = last?.bufferbloatGrade ?? '--';

        if (last && last.downloadSpeed !== undefined && last.uploadSpeed !== undefined && last.ping !== undefined) {
            const q = getQuality(last.downloadSpeed, last.uploadSpeed, last.ping);
            qualityBadge.textContent = q.label;
            qualityBadge.className = `badge ${q.cls}`;
        } else {
            qualityBadge.classList.add('hidden');
        }

        renderChart(chartEl, all);
        renderHistory(historyListEl, await loadHistory(10));

        const plan = await loadIspPlan();
        if (plan) {
            ispEmpty.classList.add('hidden');
            renderIspComparison(ispEl, last, plan);
        } else {
            ispEl.classList.add('hidden');
            ispEmpty.classList.remove('hidden');
        }
    }

    await refresh();

    startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'startTest' });
    });
    optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

    // Live-update when background finishes or history changes
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'testComplete' || msg.action === 'testError') {
            setTimeout(refresh, 200);
        }
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && 'history' in changes) refresh();
        if (area === 'sync' && ('ispPlan' in changes)) refresh();
    });
});
