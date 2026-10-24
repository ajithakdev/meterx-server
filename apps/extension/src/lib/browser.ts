/**
 * Settings and cross-browser helpers used by the service worker and the pages.
 * Chromium (Chrome, Edge, Opera) has chrome.sidePanel; Firefox has sidebarAction.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

/** Default backend. Also in static/manifest.json host_permissions; change both together. */
export { WORKER_URL as DEFAULT_SERVER_URL } from '@meterx/shared';
import { WORKER_URL as DEFAULT_SERVER_URL } from '@meterx/shared';

/** Returns an error message, or null when the URL is usable (matches optional_host_permissions). */
export function validateServerUrl(raw: string): string | null {
    let u: URL;
    try { u = new URL(raw.trim()); } catch { return 'That is not a valid URL.'; }
    if (u.protocol === 'https:') return null;
    if (u.protocol === 'http:') {
        const h = u.hostname;
        if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return null;
        return 'Use https:// for remote servers. Plain http:// works only for localhost, 127.0.0.1 and *.local.';
    }
    return 'The URL must start with https:// (or http:// for localhost).';
}

/** Origin plus any path prefix, without a trailing slash, so `${base}/ping` never becomes `//ping` (#68). */
export function normalizeServerUrl(raw: string): string {
    const u = new URL(raw.trim());
    return (u.origin + u.pathname).replace(/\/+$/, '');
}

export async function getServerUrl(): Promise<string> {
    try {
        const { serverUrl } = await chrome.storage.sync.get('serverUrl');
        if (typeof serverUrl === 'string' && serverUrl && !validateServerUrl(serverUrl)) return normalizeServerUrl(serverUrl);
    } catch { /* storage unavailable */ }
    return DEFAULT_SERVER_URL;
}

interface SidebarAction { open(): Promise<void> }
const firefoxSidebar = (): SidebarAction | undefined =>
    (globalThis as unknown as { browser?: { sidebarAction?: SidebarAction } }).browser?.sidebarAction;

export function panelSupported(): boolean {
    return !!(chrome.sidePanel?.open || firefoxSidebar());
}

/** Must run inside a click handler: both browsers require a user gesture. */
export async function openPanel(): Promise<void> {
    const ff = firefoxSidebar();
    if (ff) return ff.open();
    const win = await chrome.windows.getCurrent();
    if (win.id !== undefined) await chrome.sidePanel.open({ windowId: win.id });
}
