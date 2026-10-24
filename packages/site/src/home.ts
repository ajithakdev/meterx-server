/**
 * Home page: the in-page quick test, the speed explorer, the pinned test phases and the cycling browser names.
 * @license AGPL-3.0
 */

import { capacity, formatDuration } from './capacity';

const WORKER = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const fmtSpeed = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

// --- Quick test: a few pings and one download stream for about five seconds. Nothing runs until the visitor asks.

async function pingMs(): Promise<number> {
    const t = performance.now();
    const r = await fetch(`${WORKER}/ping`, { cache: 'no-store' });
    await r.arrayBuffer();
    return performance.now() - t;
}

async function quickTest(onSpeed: (mbps: number) => void): Promise<{ mbps: number; ping: number }> {
    await pingMs(); // warm the connection; the first request includes the TLS handshake
    const pings: number[] = [];
    for (let i = 0; i < 5; i++) pings.push(await pingMs());
    pings.sort((a, b) => a - b);
    const ping = pings[2];

    const ctrl = new AbortController();
    const stop = setTimeout(() => ctrl.abort(), 5500);
    const res = await fetch(`${WORKER}/test-file/25MB.bin`, { cache: 'no-store', signal: ctrl.signal });
    const reader = res.body!.getReader();
    const t0 = performance.now();
    const RAMP = 600; // skip slow start so the figure reflects the steady rate
    let bytes = 0, rampBytes = 0, mbps = 0, last = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            const t = performance.now() - t0;
            if (t < RAMP) { rampBytes = bytes; continue; }
            mbps = ((bytes - rampBytes) * 8) / ((t - RAMP) * 1000);
            if (t - last > 200) { onSpeed(mbps); last = t; }
        }
    } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
    } finally {
        clearTimeout(stop);
    }
    // A fast line can finish inside the ramp window; then the whole transfer is the best estimate.
    if (!mbps && bytes) mbps = (bytes * 8) / ((performance.now() - t0) * 1000);
    return { mbps, ping };
}

function wireQuickTest(): void {
    const btn = $<HTMLButtonElement>('qtRun'), note = $('qtNote');
    if (!btn || !note) return;
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = 'Testing…';
        note.textContent = 'Measuring ping, then download…';
        try {
            const r = await quickTest(m => { note.innerHTML = `Download <b>${fmtSpeed(m)} Mbps</b> so far…`; });
            note.innerHTML = `Download <b>${fmtSpeed(r.mbps)} Mbps</b>, ping ${r.ping.toFixed(0)} ms from this page.`;
            setExplorer(Math.round(r.mbps));
        } catch {
            note.textContent = 'The test server could not be reached from here. Install MeterX to test from your toolbar.';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run it again';
        }
    });
}

// --- Speed explorer: type a speed, see what it buys.

function renderExplorer(raw: string): void {
    const out = $('explain');
    if (!out) return;
    const v = Number(raw.replace(/[^\d.]/g, ''));
    const c = capacity(v);
    if (!c) { out.innerHTML = '<li><span class="k">Type a download speed in Mbps</span></li>'; return; }
    out.innerHTML = [
        ['4K streams at once', String(c.streams4k)],
        ['HD streams at once', String(c.streamsHd)],
        ['A 50 GB game download', formatDuration(c.gameSeconds)],
        ['A 4 GB film download', formatDuration(c.filmSeconds)],
    ].map(([k, val]) => `<li><span class="k">${k}</span><span class="v">${val}</span></li>`).join('');
}

/** The input is part of the headline, so it is exactly as wide as its digits. */
let ruler: CanvasRenderingContext2D | null = null;
function fitInput(input: HTMLInputElement): void {
    ruler ??= document.createElement('canvas').getContext('2d');
    if (!ruler) return;
    const cs = getComputedStyle(input);
    ruler.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ruler.letterSpacing = cs.letterSpacing;
    input.style.width = `${Math.ceil(ruler.measureText(input.value || '0').width) + 4}px`;
}

function setExplorer(v: number): void {
    const input = $<HTMLInputElement>('speedInput');
    if (!input) return;
    input.value = String(v);
    fitInput(input);
    renderExplorer(input.value);
}

function wireExplorer(): void {
    const input = $<HTMLInputElement>('speedInput');
    if (!input) return;
    input.addEventListener('input', () => { fitInput(input); renderExplorer(input.value); });
    document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.addEventListener('click', () => setExplorer(Number(b.dataset.speed))));
    fitInput(input);
    renderExplorer(input.value);
}

// --- How it works: the bar's segment for the step on screen is lit.

function wireSteps(): void {
    const steps = document.querySelectorAll<HTMLElement>('[data-step]');
    const segs = document.querySelectorAll<HTMLElement>('.phase-bar [data-seg]');
    if (!steps.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (!e.isIntersecting) continue;
            const id = (e.target as HTMLElement).dataset.step;
            segs.forEach(s => s.classList.toggle('on', s.dataset.seg === id));
            steps.forEach(s => s.classList.toggle('on', s === e.target));
        }
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
}

// --- Browser names: one lit at a time.

function wireNames(): void {
    const names = [...document.querySelectorAll<HTMLElement>('.names .name')];
    if (names.length < 2 || reduced) return;
    let i = 0;
    setInterval(() => {
        names[i].classList.remove('lit');
        i = (i + 1) % names.length;
        names[i].classList.add('lit');
    }, 2000);
}

wireQuickTest();
wireExplorer();
wireSteps();
wireNames();
