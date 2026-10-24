/**
 * Runs the real extension pages (popup, side panel, settings) on the website in demo mode.
 * Loaded before the page script; stands in for the extension APIs with sample data in memory.
 * The parent page can drive the sample test with postMessage({ mxDemo: 'drive', p }).
 * @license AGPL-3.0
 */

import { VERSION, WORKER_URL, type BroadcastMessage, type HistoryEntry } from '@meterx/shared';
import { SAMPLE_PLAN, sampleFrame, sampleHistory, sampleResult } from './sample';

type Area = 'local' | 'sync';
type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
const data: Record<Area, Record<string, unknown>> = { local: { history: sampleHistory() }, sync: { ispPlan: SAMPLE_PLAN } };
const changeListeners: Array<(c: Changes, area: Area) => void> = [];
const messageListeners: Array<(m: BroadcastMessage) => void> = [];

function area(name: Area) {
    const store = data[name];
    return {
        async get(keys?: string | string[] | Record<string, unknown> | null) {
            if (keys == null) return { ...store };
            if (typeof keys === 'string') return keys in store ? { [keys]: store[keys] } : {};
            if (Array.isArray(keys)) return Object.fromEntries(keys.filter(k => k in store).map(k => [k, store[k]]));
            return Object.fromEntries(Object.entries(keys).map(([k, d]) => [k, k in store ? store[k] : d]));
        },
        async set(items: Record<string, unknown>) {
            const changes: Changes = {};
            for (const [k, v] of Object.entries(items)) { changes[k] = { oldValue: store[k], newValue: v }; store[k] = v; }
            changeListeners.forEach(f => f(changes, name));
        },
        async remove(keys: string | string[]) {
            const changes: Changes = {};
            for (const k of ([] as string[]).concat(keys)) { changes[k] = { oldValue: store[k] }; delete store[k]; }
            changeListeners.forEach(f => f(changes, name));
        },
    };
}

const broadcast = (m: BroadcastMessage) => messageListeners.forEach(f => f(m));

// --- The sample test, played on a timer (Run test) or driven by the parent page's scroll.
let running = false;
let progress = {};
let timer: number | undefined;

function show(p: number, save: boolean): void {
    const f = sampleFrame(p);
    if (f === null) {
        if (running) { running = false; broadcast({ action: 'testError', error: 'Test cancelled', cancelled: true }); }
    } else if (f === 'done') {
        if (running) {
            running = false;
            const entry = sampleResult();
            if (save) void area('local').set({ history: [entry, ...(data.local.history as HistoryEntry[])].slice(0, 200) });
            broadcast({ action: 'testComplete', data: entry });
        }
    } else {
        running = true;
        progress = f;
        broadcast({ action: 'testProgress', data: f });
    }
}

function play(): void {
    clearInterval(timer);
    const t0 = performance.now(), length = 7000; // the real test takes about 20 s; the demo plays it faster
    timer = window.setInterval(() => {
        const p = (performance.now() - t0) / length;
        show(Math.min(p, 1), true);
        if (p >= 1) clearInterval(timer);
    }, 120);
}

const chromeDemo = {
    storage: { local: area('local'), sync: area('sync'), onChanged: { addListener: (f: (c: Changes, a: Area) => void) => changeListeners.push(f) } },
    runtime: {
        async sendMessage(m: { action?: string }) {
            if (m?.action === 'getState') return running ? { running, progress } : null;
            if (m?.action === 'startTest') { play(); return { ok: true }; }
            if (m?.action === 'cancelTest') { clearInterval(timer); show(0, false); return { ok: true }; }
            return { ok: true };
        },
        onMessage: { addListener: (f: (m: BroadcastMessage) => void) => messageListeners.push(f) },
        getURL: (p: string) => p,
        openOptionsPage: () => parent.postMessage({ mxDemo: 'openOptions' }, location.origin),
    },
    permissions: { contains: async () => true, request: async () => true },
    sidePanel: { open: async () => parent.postMessage({ mxDemo: 'openSidePanel' }, location.origin) },
    windows: { getCurrent: async () => ({ id: 1 }) },
    tabs: { create: (o: { url?: string }) => { if (o?.url) window.open(o.url, '_blank', 'noopener'); } },
};
(window as unknown as { chrome: unknown }).chrome = chromeDemo;

window.addEventListener('message', e => {
    if (e.origin !== location.origin) return;
    if (e.data?.mxDemo === 'play') { play(); return; }
    if (e.data?.mxDemo === 'flow') { document.documentElement.classList.add('mx-flow'); return; }
    if (e.data?.mxDemo !== 'drive' || typeof e.data.p !== 'number') return;
    clearInterval(timer);
    show(e.data.p, false);
});

// The demo answers the test server itself, so the pages show a connected state without touching the network.
const realFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.startsWith(WORKER_URL)) return realFetch(input, init);
    const path = new URL(url).pathname;
    const body = path === '/health' ? JSON.stringify({ status: 'ok', server: 'cloudflare-worker', version: VERSION, edge: 'MAA', timestamp: Date.now() }) : 'Pong!';
    return new Promise(resolve => setTimeout(() => resolve(new Response(body, { status: 200, headers: { 'Content-Type': path === '/health' ? 'application/json' : 'text/plain' } })), 18));
};

// On the site, pages sit inside a frame: tighter padding, and the frame takes the page's height so only the site scrolls.
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    // At fractional browser zoom a page can round a pixel past its frame; the demo pages never scroll as a page.
    style.textContent = 'html,body{overflow:hidden}.settings .wrap{max-width:none;padding:8px 20px 20px}.settings #closeBtn{visibility:hidden}'
        // Flow mode (phones): the side panel lays out at full height instead of fitting the frame, so the frame grows and nothing scrolls inside it.
        + 'html.mx-flow .panel .wrap{height:auto!important;display:block!important}html.mx-flow .panel main{grid-template-rows:none!important}html.mx-flow .results-body{overflow:visible!important}html.mx-flow #rows tr:nth-child(n+7){display:none}';
    document.head.append(style);
    const report = () => parent.postMessage({ mxDemo: 'height', h: Math.ceil(document.documentElement.scrollHeight) }, location.origin);
    new ResizeObserver(report).observe(document.body);
    report();
});
