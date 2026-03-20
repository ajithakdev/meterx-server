/**
 * MeterX Options Page
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

const DEFAULT_URL = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';

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

    // Close button
    closeBtn.addEventListener('click', () => window.close());

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

        // Re-check status with new URL
        checkStatus();

        // Brief save confirmation
        const origText = saveBtn.textContent;
        saveBtn.textContent = 'Saved';
        setTimeout(() => { saveBtn.textContent = origText; }, 1500);
    });
});
