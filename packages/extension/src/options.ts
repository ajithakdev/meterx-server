/**
 * MeterX Options Page
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { IspPlan } from '@meterx/shared';

const DEFAULT_URL = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';
const ISP_KEY = 'ispPlan';
const SCHEDULE_KEY = 'scheduleMinutes';
const NOTIFY_KEY = 'notifyOnDrop';

// IATA code to city name mapping for common Cloudflare PoPs
const EDGE_NAMES: Record<string, string> = {
    BOM: 'Mumbai', MAA: 'Chennai', DEL: 'Delhi', BLR: 'Bangalore',
    HYD: 'Hyderabad', CCU: 'Kolkata', SIN: 'Singapore', HKG: 'Hong Kong',
    NRT: 'Tokyo', ICN: 'Seoul', SYD: 'Sydney', LHR: 'London',
    FRA: 'Frankfurt', CDG: 'Paris', AMS: 'Amsterdam', IAD: 'Washington DC',
    SJC: 'San Jose', LAX: 'Los Angeles', ORD: 'Chicago', DFW: 'Dallas',
    ATL: 'Atlanta', MIA: 'Miami', YYZ: 'Toronto', GRU: 'Sao Paulo',
    JNB: 'Johannesburg', DXB: 'Dubai', KUL: 'Kuala Lumpur', BKK: 'Bangkok',
};

document.addEventListener('DOMContentLoaded', async () => {
    const statusDot = document.getElementById('statusDot') as HTMLElement;
    const statusLabel = document.getElementById('statusLabel') as HTMLElement;
    const statusDetail = document.getElementById('statusDetail') as HTMLElement;
    const statusPing = document.getElementById('statusPing') as HTMLElement;
    const urlInput = document.getElementById('serverUrl') as HTMLInputElement;
    const customSection = document.getElementById('customUrlSection') as HTMLElement;
    const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    const testStatus = document.getElementById('testStatus') as HTMLElement;
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="serverType"]');
    const radioOptions = document.querySelectorAll('.radio-option');

    const ispDown = document.getElementById('ispDown') as HTMLInputElement | null;
    const ispUp = document.getElementById('ispUp') as HTMLInputElement | null;
    const ispProvider = document.getElementById('ispProvider') as HTMLInputElement | null;
    const ispClearBtn = document.getElementById('ispClearBtn') as HTMLButtonElement | null;
    const scheduleRadios = document.querySelectorAll<HTMLInputElement>('input[name="schedule"]');
    const notifyCheckbox = document.getElementById('notifyOnDrop') as HTMLInputElement | null;

    // Close button
    closeBtn.addEventListener('click', () => window.close());

    // Load ISP plan + schedule prefs
    const stored = await chrome.storage.sync.get([ISP_KEY, SCHEDULE_KEY, NOTIFY_KEY]);
    const plan = stored[ISP_KEY] as IspPlan | undefined;
    if (plan && ispDown && ispUp && ispProvider) {
        ispDown.value = String(plan.downloadMbps);
        ispUp.value = String(plan.uploadMbps);
        ispProvider.value = plan.providerName ?? '';
    }
    const scheduleMinutes: number = stored[SCHEDULE_KEY] ?? 0;
    scheduleRadios.forEach(r => { r.checked = Number(r.value) === scheduleMinutes || (r.value === 'off' && scheduleMinutes === 0); });
    if (notifyCheckbox) notifyCheckbox.checked = !!stored[NOTIFY_KEY];

    if (ispClearBtn) {
        ispClearBtn.addEventListener('click', async () => {
            if (ispDown) ispDown.value = '';
            if (ispUp) ispUp.value = '';
            if (ispProvider) ispProvider.value = '';
            await chrome.storage.sync.remove(ISP_KEY);
        });
    }

    // Load current setting
    const result = await chrome.storage.sync.get('serverUrl');
    const currentUrl = result.serverUrl || '';
    const isCustom = currentUrl && currentUrl !== DEFAULT_URL;

    if (isCustom) {
        urlInput.value = currentUrl;
        (document.querySelector('input[value="custom"]') as HTMLInputElement).checked = true;
        customSection.classList.remove('hidden');
    }

    // Highlight selected radio
    function updateRadioStyles(): void {
        radioOptions.forEach(opt => {
            const input = opt.querySelector('input') as HTMLInputElement;
            opt.classList.toggle('selected', input.checked);
        });
    }
    updateRadioStyles();

    // Radio toggle
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            const isCustom = radio.value === 'custom';
            customSection.classList.toggle('hidden', !isCustom);
            updateRadioStyles();
        });
    });

    // Validate server URL matches manifest-declared optional_host_permissions patterns.
    // Why: manifest now scopes http:// to localhost/127.0.0.1/*.local only. Reject anything else
    // before chrome.permissions.request to surface a clear error instead of a silent denial.
    function validateServerUrl(raw: string): string | null {
        let parsed: URL;
        try { parsed = new URL(raw); } catch { return 'Invalid URL format'; }
        if (parsed.protocol === 'https:') return null;
        if (parsed.protocol === 'http:') {
            const host = parsed.hostname;
            if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return null;
            return 'Plain http:// only allowed for localhost, 127.0.0.1, or *.local. Use https for remote servers.';
        }
        return 'URL must use https:// (or http:// for localhost)';
    }

    // Get active server URL
    function getActiveUrl(): string {
        const customRadio = document.querySelector('input[value="custom"]') as HTMLInputElement;
        if (customRadio.checked && urlInput.value.trim()) {
            return urlInput.value.trim();
        }
        return DEFAULT_URL;
    }

    // Test connection and measure ping
    async function testConnection(url: string): Promise<{ ok: boolean; ping?: number; edge?: string; error?: string }> {
        try {
            const start = performance.now();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`${url}/health`, { signal: controller.signal, cache: 'no-store' });
            clearTimeout(timeout);
            const ping = Math.round(performance.now() - start);

            if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

            const data = await response.json();
            return { ok: true, ping, edge: data.edge };
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed';
            return { ok: false, error: msg.includes('abort') ? 'Timed out' : msg };
        }
    }

    // Update status card
    async function checkStatus(): Promise<void> {
        const url = getActiveUrl();
        statusDot.className = 'status-dot checking';
        statusLabel.textContent = 'Checking connection...';
        statusDetail.textContent = '';
        statusPing.textContent = '';

        const result = await testConnection(url);

        if (result.ok) {
            statusDot.className = 'status-dot online';
            const edgeName = result.edge ? (EDGE_NAMES[result.edge] || result.edge) : '';
            const isDefault = url === DEFAULT_URL;
            statusLabel.textContent = isDefault
                ? `Connected to Cloudflare${edgeName ? ` (${edgeName})` : ''}`
                : `Connected to custom server`;
            statusDetail.textContent = isDefault && edgeName
                ? `Edge: ${result.edge} — auto-routed to nearest location`
                : url.replace(/^https?:\/\//, '');
            statusPing.textContent = `${result.ping}ms`;
        } else {
            statusDot.className = 'status-dot offline';
            statusLabel.textContent = 'Connection failed';
            statusDetail.textContent = result.error || 'Server unreachable';
            statusPing.textContent = '';
        }
    }

    // Auto-check on load
    checkStatus();

    // Test button (for custom URL)
    testBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url) { testStatus.textContent = 'Enter a URL first'; testStatus.className = 'test-status error'; return; }

        testStatus.textContent = 'Testing...';
        testStatus.className = 'test-status';

        const result = await testConnection(url);
        if (result.ok) {
            testStatus.textContent = `Connected (${result.ping}ms)${result.edge ? ` — edge: ${result.edge}` : ''}`;
            testStatus.className = 'test-status success';
        } else {
            testStatus.textContent = result.error || 'Connection failed';
            testStatus.className = 'test-status error';
        }
    });

    // Save
    saveBtn.addEventListener('click', async () => {
        const customRadio = document.querySelector('input[value="custom"]') as HTMLInputElement;

        if (customRadio.checked) {
            const url = urlInput.value.trim();
            if (!url) {
                testStatus.textContent = 'Enter a server URL';
                testStatus.className = 'test-status error';
                return;
            }
            const validationError = validateServerUrl(url);
            if (validationError) {
                testStatus.textContent = validationError;
                testStatus.className = 'test-status error';
                return;
            }
            // Request host permission for custom URL
            try {
                const origin = new URL(url).origin + '/*';
                const granted = await chrome.permissions.request({ origins: [origin] });
                if (!granted) {
                    testStatus.textContent = 'Permission denied for this URL';
                    testStatus.className = 'test-status error';
                    return;
                }
            } catch {
                testStatus.textContent = 'Invalid URL format';
                testStatus.className = 'test-status error';
                return;
            }
            await chrome.storage.sync.set({ serverUrl: url });
        } else {
            await chrome.storage.sync.remove('serverUrl');
        }

        // Save ISP plan
        if (ispDown && ispUp) {
            const dl = Number(ispDown.value);
            const ul = Number(ispUp.value);
            if (dl > 0 || ul > 0) {
                const planToSave: IspPlan = {
                    downloadMbps: dl > 0 ? dl : 0,
                    uploadMbps: ul > 0 ? ul : 0,
                    providerName: ispProvider?.value.trim() || undefined,
                };
                await chrome.storage.sync.set({ [ISP_KEY]: planToSave });
            } else {
                await chrome.storage.sync.remove(ISP_KEY);
            }
        }

        // Save schedule
        const selectedSchedule = Array.from(scheduleRadios).find(r => r.checked);
        const minutes = selectedSchedule && selectedSchedule.value !== 'off' ? Number(selectedSchedule.value) : 0;
        await chrome.storage.sync.set({ [SCHEDULE_KEY]: minutes, [NOTIFY_KEY]: !!notifyCheckbox?.checked });
        chrome.runtime.sendMessage({ action: 'rescheduleTests' });

        // Re-check status with new URL
        checkStatus();

        // Brief save confirmation
        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Saved';
        setTimeout(() => { saveBtn.textContent = origText; }, 1500);
    });
});
