/**
 * MeterX service worker: runs tests, saves history, schedules, notifies.
 * Pages talk to it with chrome.runtime messages (see docs/CODEMAP.md).
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { BroadcastMessage, HistoryEntry, TestProgress } from '@meterx/shared';
import { getServerUrl } from '../lib/browser';
import { saveHistory } from '../lib/history';
import { getQuality, QUALITY_COLORS } from '../lib/quality';
import { CancelledError, HttpError, runTest } from './runner';

const ALARM = 'meterx-scheduled-test';
const DROP_NOTIFICATION = 'meterx-quality-drop';

type Source = 'user' | 'schedule' | 'shortcut';

let controller: AbortController | null = null;
let progress: TestProgress = {};

function broadcast(message: BroadcastMessage): void {
    chrome.runtime.sendMessage(message).catch(() => { /* no page open */ });
}

function report(p: TestProgress): void {
    progress = { ...progress, ...p };
    broadcast({ action: 'testProgress', data: p });
}

function describeError(e: unknown): string {
    if (e instanceof HttpError && e.status === 429) return 'The server is busy. Try again in a minute.';
    if (e instanceof HttpError) return `The server answered with an error (HTTP ${e.status}).`;
    if (e instanceof TypeError) return "Can't reach the test server. Check your connection or the server in Settings.";
    return e instanceof Error ? e.message : 'The test failed.';
}

async function setBadge(entry: HistoryEntry): Promise<void> {
    if (entry.downloadSpeed === undefined) return;
    const dl = entry.downloadSpeed;
    await chrome.action.setBadgeText({ text: dl >= 100 ? String(Math.round(dl)) : dl.toFixed(dl >= 10 ? 0 : 1) });
    const q = getQuality(entry.downloadSpeed, entry.uploadSpeed ?? 0, entry.ping ?? 999);
    await chrome.action.setBadgeBackgroundColor({ color: QUALITY_COLORS[q.cls] });
}

/** Notify only when a scheduled test drops to Poor from something better (#67). */
async function maybeNotifyDrop(entry: HistoryEntry, previous?: HistoryEntry): Promise<void> {
    const { notifyOnDrop } = await chrome.storage.sync.get('notifyOnDrop');
    if (!notifyOnDrop || entry.downloadSpeed === undefined) return;
    const grade = (e: HistoryEntry) => getQuality(e.downloadSpeed ?? 0, e.uploadSpeed ?? 0, e.ping ?? 999).cls;
    if (grade(entry) !== 'poor' || (previous && grade(previous) === 'poor')) return;
    await chrome.notifications.create(DROP_NOTIFICATION, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('images/icon-128.png'),
        title: 'Your connection dropped to Poor',
        message: `${entry.downloadSpeed.toFixed(1)} Mbps down, ${(entry.ping ?? 0).toFixed(0)} ms ping. Open MeterX for details.`,
    });
}

async function startTest(source: Source): Promise<void> {
    if (controller) return;
    controller = new AbortController();
    progress = {};
    try {
        const results = await runTest(await getServerUrl(), controller.signal, report);
        const { serverUrl: _server, ...rest } = results;
        const entry: HistoryEntry = { ...rest, timestamp: Date.now() };
        const previous = await saveHistory(entry);
        await setBadge(entry);
        broadcast({ action: 'testComplete', data: entry });
        if (source === 'schedule') await maybeNotifyDrop(entry, previous);
    } catch (e) {
        const cancelled = e instanceof CancelledError || controller.signal.aborted;
        if (!cancelled) console.error('MeterX test failed:', e);
        broadcast({ action: 'testError', error: cancelled ? 'Test cancelled' : describeError(e), cancelled });
    } finally {
        controller = null;
        progress = {};
    }
}

/** Creates the alarm only when it is missing or its period changed, so browser restarts don't reset it (#66). */
async function syncAlarm(force = false): Promise<void> {
    const minutes = Number((await chrome.storage.sync.get('scheduleMinutes')).scheduleMinutes) || 0;
    const existing = await chrome.alarms.get(ALARM);
    if (!minutes) { if (existing) await chrome.alarms.clear(ALARM); return; }
    if (!force && existing?.periodInMinutes === minutes) return;
    await chrome.alarms.create(ALARM, { periodInMinutes: minutes, delayInMinutes: minutes });
}

chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === ALARM) startTest('schedule'); });
chrome.runtime.onInstalled.addListener(() => { syncAlarm(); });
chrome.runtime.onStartup.addListener(() => { syncAlarm(); });
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && 'scheduleMinutes' in changes) syncAlarm(true);
});
chrome.commands?.onCommand.addListener(command => { if (command === 'run-test') startTest('shortcut'); });
chrome.notifications?.onClicked.addListener(id => {
    if (id === DROP_NOTIFICATION) chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
});

chrome.runtime.onMessage.addListener((message: { action?: string }, _sender, sendResponse) => {
    switch (message.action) {
        case 'startTest':
            startTest('user');
            sendResponse({ running: true });
            return false;
        case 'cancelTest':
            controller?.abort();
            sendResponse({ running: false });
            return false;
        case 'getState':
            sendResponse({ running: !!controller, progress });
            return false;
    }
    return false;
});
