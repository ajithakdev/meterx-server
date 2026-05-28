/**
 * MeterX Options Page — auto-saving settings
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { IspPlan } from '@meterx/shared';

const DEFAULT_URL = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';
const ISP_KEY = 'ispPlan';
const SCHEDULE_KEY = 'scheduleMinutes';
const NOTIFY_KEY = 'notifyOnDrop';

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
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="serverType"]');
    const radioOptions = document.querySelectorAll('.radio-option');

    const ispDown = document.getElementById('ispDown') as HTMLInputElement | null;
    const ispUp = document.getElementById('ispUp') as HTMLInputElement | null;
    const ispProvider = document.getElementById('ispProvider') as HTMLInputElement | null;
    const ispClearBtn = document.getElementById('ispClearBtn') as HTMLButtonElement | null;
    const scheduleRadios = document.querySelectorAll<HTMLInputElement>('input[name="schedule"]');
    const notifyCheckbox = document.getElementById('notifyOnDrop') as HTMLInputElement | null;
    const popupWidthSlider = document.getElementById('popupWidth') as HTMLInputElement | null;
    const popupWidthVal = document.getElementById('popupWidthVal') as HTMLElement | null;
    const livePreviewCb = document.getElementById('livePreview') as HTMLInputElement | null;
    const previewFrame = document.getElementById('previewFrame') as HTMLElement | null;
    const previewPopup = document.getElementById('previewPopup') as HTMLElement | null;
    const previewLabel = document.getElementById('previewLabel') as HTMLElement | null;
    const saveToast = document.getElementById('saveToast') as HTMLElement | null;

    closeBtn.addEventListener('click', () => window.close());

    // ── Toast notification ──
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    function showToast(): void {
        if (!saveToast) return;
        saveToast.classList.remove('hidden');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => saveToast.classList.add('hidden'), 1500);
    }

    // ── Auto-save debounce ──
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    function autoSave(): void {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            await saveAllSettings();
            showToast();
        }, 500);
    }

    // Apply theme
    const { theme } = await chrome.storage.sync.get('theme');
    const themeMode = (theme || 'auto') as 'auto' | 'dark' | 'light';
    if (themeMode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    } else {
        document.documentElement.dataset.theme = themeMode;
    }

    // Load settings
    const stored = await chrome.storage.sync.get([ISP_KEY, SCHEDULE_KEY, NOTIFY_KEY, 'popupWidth']);
    const plan = stored[ISP_KEY] as IspPlan | undefined;
    if (plan && ispDown && ispUp && ispProvider) {
        ispDown.value = String(plan.downloadMbps);
        ispUp.value = String(plan.uploadMbps);
        ispProvider.value = plan.providerName ?? '';
    }
    const scheduleMinutes: number = stored[SCHEDULE_KEY] ?? 0;
    scheduleRadios.forEach(r => { r.checked = Number(r.value) === scheduleMinutes || (r.value === 'off' && scheduleMinutes === 0); });
    if (notifyCheckbox) notifyCheckbox.checked = !!stored[NOTIFY_KEY];

    const savedWidth = stored.popupWidth || 380;
    if (popupWidthSlider) {
        popupWidthSlider.value = String(savedWidth);
        if (popupWidthVal) popupWidthVal.textContent = `${savedWidth}px`;
    }

    // ISP clear
    if (ispClearBtn) {
        ispClearBtn.addEventListener('click', async () => {
            if (ispDown) ispDown.value = '';
            if (ispUp) ispUp.value = '';
            if (ispProvider) ispProvider.value = '';
            await chrome.storage.sync.remove(ISP_KEY);
            showToast();
        });
    }

    // Load server URL
    const result = await chrome.storage.sync.get('serverUrl');
    const currentUrl = result.serverUrl || '';
    const isCustom = currentUrl && currentUrl !== DEFAULT_URL;

    if (isCustom) {
        urlInput.value = currentUrl;
        (document.querySelector('input[value="custom"]') as HTMLInputElement).checked = true;
        customSection.classList.remove('hidden');
    }

    function updateRadioStyles(): void {
        radioOptions.forEach(opt => {
            const input = opt.querySelector('input') as HTMLInputElement;
            opt.classList.toggle('selected', input.checked);
        });
    }
    updateRadioStyles();

    // ── Auto-save on any change ──
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            const isCustom = radio.value === 'custom';
            customSection.classList.toggle('hidden', !isCustom);
            updateRadioStyles();
            autoSave();
        });
    });

    // ISP fields auto-save
    [ispDown, ispUp, ispProvider].forEach(el => {
        if (el) el.addEventListener('input', autoSave);
    });

    // Schedule auto-save
    scheduleRadios.forEach(r => r.addEventListener('change', autoSave));
    if (notifyCheckbox) notifyCheckbox.addEventListener('change', autoSave);

    // Popup width slider
    if (popupWidthSlider) {
        popupWidthSlider.addEventListener('input', () => {
            const w = popupWidthSlider.value;
            if (popupWidthVal) popupWidthVal.textContent = `${w}px`;
            updatePreview(Number(w));
            autoSave();
        });
    }

    // Live preview toggle
    if (livePreviewCb && previewFrame) {
        livePreviewCb.addEventListener('change', () => {
            previewFrame.classList.toggle('hidden', !livePreviewCb.checked);
            if (livePreviewCb.checked) updatePreview(Number(popupWidthSlider?.value || 380));
        });
    }

    function updatePreview(width: number): void {
        if (!previewPopup || !previewLabel || !livePreviewCb?.checked) return;
        const screenW = window.screen.width;
        const screenInch = Math.round(Math.sqrt(screenW * screenW + (screenW * 0.5625) * (screenW * 0.5625)) / 96);
        
        const previewScreenEl = document.getElementById('previewScreen');
        // Subtract padding from clientWidth for true container width
        const containerW = previewScreenEl ? (previewScreenEl.clientWidth - 40) : 420;
        
        // Exact proportion scale to mimic screen
        const scale = containerW / screenW;
        
        previewPopup.style.width = `${width}px`;
        previewPopup.style.transform = `scale(${scale})`;
        previewPopup.style.transformOrigin = 'top center';
        
        previewLabel.textContent = `${width}px on ~${screenInch}" display`;
    }

    // URL validation
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

    function getActiveUrl(): string {
        const customRadio = document.querySelector('input[value="custom"]') as HTMLInputElement;
        if (customRadio.checked && urlInput.value.trim()) {
            return urlInput.value.trim();
        }
        return DEFAULT_URL;
    }

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

    checkStatus();

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

    // ── Save all settings ──
    async function saveAllSettings(): Promise<void> {
        const customRadio = document.querySelector('input[value="custom"]') as HTMLInputElement;

        if (customRadio.checked) {
            const url = urlInput.value.trim();
            if (url) {
                const validationError = validateServerUrl(url);
                if (!validationError) {
                    try {
                        const origin = new URL(url).origin + '/*';
                        const granted = await chrome.permissions.request({ origins: [origin] });
                        if (granted) await chrome.storage.sync.set({ serverUrl: url });
                    } catch { /* ignore */ }
                }
            }
        } else {
            await chrome.storage.sync.remove('serverUrl');
        }

        // ISP plan
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

        // Schedule
        const selectedSchedule = Array.from(scheduleRadios).find(r => r.checked);
        const minutes = selectedSchedule && selectedSchedule.value !== 'off' ? Number(selectedSchedule.value) : 0;
        await chrome.storage.sync.set({ [SCHEDULE_KEY]: minutes, [NOTIFY_KEY]: !!notifyCheckbox?.checked });

        // Popup width
        if (popupWidthSlider) {
            await chrome.storage.sync.set({ popupWidth: Number(popupWidthSlider.value) });
        }

        chrome.runtime.sendMessage({ action: 'rescheduleTests' });
    }

    // ── Reset to defaults ──
    resetBtn.addEventListener('click', async () => {
        await chrome.storage.sync.remove(['serverUrl', ISP_KEY, SCHEDULE_KEY, NOTIFY_KEY, 'popupWidth']);
        // Reset UI
        (document.querySelector('input[value="default"]') as HTMLInputElement).checked = true;
        customSection.classList.add('hidden');
        updateRadioStyles();
        if (ispDown) ispDown.value = '';
        if (ispUp) ispUp.value = '';
        if (ispProvider) ispProvider.value = '';
        scheduleRadios.forEach(r => { r.checked = r.value === 'off'; });
        if (notifyCheckbox) notifyCheckbox.checked = false;
        if (popupWidthSlider) {
            popupWidthSlider.value = '380';
            if (popupWidthVal) popupWidthVal.textContent = '380px';
        }
        updatePreview(380);
        chrome.runtime.sendMessage({ action: 'rescheduleTests' });
        checkStatus();
        showToast();
    });

    // URL input auto-save with longer debounce
    urlInput.addEventListener('input', () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            await saveAllSettings();
            checkStatus();
            showToast();
        }, 1500);
    });
});
