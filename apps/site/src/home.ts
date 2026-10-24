/**
 * Home page: scroll drives the real popup through a sample test, the phase log follows it,
 * and the closing question measures what a speed buys.
 * @license AGPL-3.0
 */

import { fmtSpeed } from '@meterx/shared';
import { capacity, formatDuration } from './capacity';
import { quickTest } from './quick-test';
import { PHASES, sampleFrame, sampleResult } from './sample';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

// --- Hero: the act's scroll progress is the test's playhead.

const ORDER = ['connect', 'latency', 'download', 'upload', 'done'] as const;

function logState(p: number): void {
    const f = sampleFrame(p);
    const done = f === 'done', r = sampleResult();
    const current = f === null ? null : done ? 'done' : f.phase;
    const reached = current ? ORDER.indexOf(current as typeof ORDER[number]) : -1;
    const val: Record<string, string> = {
        connect: reached >= 0 ? 'Cloudflare MAA' : '',
        latency: reached >= 1 ? `${(done ? r.ping! : (f as { ping?: number })?.ping ?? r.ping!).toFixed(0)} ms` : '',
        download: reached >= 2 ? `${fmtSpeed(done || reached > 2 ? r.downloadSpeed : (f as { downloadSpeed?: number }).downloadSpeed)} Mbps` : '',
        upload: reached >= 3 ? `${fmtSpeed(done ? r.uploadSpeed : (f as { uploadSpeed?: number }).uploadSpeed)} Mbps` : '',
        done: done ? 'Excellent' : '',
    };
    document.querySelectorAll<HTMLElement>('#phaseLog li').forEach((li, i) => {
        li.dataset.state = i < reached || (done && i === reached) ? 'done' : i === reached ? 'active' : 'pending';
        li.querySelector('b')!.textContent = val[li.dataset.phase!];
    });
}

function wireHero(): void {
    const act = $('hero'), frame = $<HTMLIFrameElement>('heroPopup');
    if (!act || !frame) return;
    if (matchMedia('(max-width: 900px), (min-height: 1100px)').matches) {
        // Phones and very tall windows do not pin the hero (see home.css), so the popup plays the sample test by itself when it comes into view.
        const io = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            frame.contentWindow?.postMessage({ mxDemo: 'play' }, location.origin);
            io.disconnect();
        }, { threshold: 0.5 });
        frame.addEventListener('load', () => io.observe(frame));
        return;
    }
    // The pinned stage is a full window tall but its content is shorter; pull the next section up into
    // that empty space so the page does not show a blank band once the pin lets go.
    const stage = act.querySelector<HTMLElement>('[data-sc-stage]'), content = act.querySelector<HTMLElement>('.split'), next = act.nextElementSibling as HTMLElement | null;
    if (stage && content && next) {
        const close = () => {
            // The popup's caption can sit below the split's box when the popup is drawn smaller, so take the lowest of both.
            const bottom = Math.max(...[content, ...content.querySelectorAll('.demo-note, .actions')].map(e => e.getBoundingClientRect().bottom));
            const empty = stage.clientHeight - (bottom - stage.getBoundingClientRect().top);
            next.style.marginTop = `${-Math.max(0, Math.round(empty) - 64)}px`;
        };
        new ResizeObserver(close).observe(stage);
        addEventListener('load', close);
    }
    let ready = false, last = -1;
    frame.addEventListener('load', () => { ready = true; last = -1; });
    const tick = () => {
        const p = parseFloat(act.style.getPropertyValue('--sc-p')) || 0;
        if (Math.abs(p - last) > 0.002) {
            last = p;
            logState(p);
            // shortcut: the act's progress maps straight onto the test; past PHASES.done the result holds
            if (ready) frame.contentWindow?.postMessage({ mxDemo: 'drive', p }, location.origin);
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    logState(0);
}

// --- The closing question: type a speed, see what it buys; or measure this browser.

let ruler: CanvasRenderingContext2D | null = null;
/** The input is part of the heading, so it is exactly as wide as its digits. */
function fitInput(input: HTMLInputElement): void {
    ruler ??= document.createElement('canvas').getContext('2d');
    if (!ruler) return;
    const cs = getComputedStyle(input);
    ruler.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ruler.letterSpacing = cs.letterSpacing;
    input.style.width = `${Math.ceil(ruler.measureText(input.value || '0').width) + 6}px`;
}

function renderExplorer(input: HTMLInputElement): void {
    fitInput(input);
    const out = $('explain');
    if (!out) return;
    const c = capacity(Number(input.value.replace(/[^\d.]/g, '')));
    out.innerHTML = c
        ? [['4K streams at once', String(c.streams4k)], ['HD streams at once', String(c.streamsHd)], ['A 50 GB game download', formatDuration(c.gameSeconds)], ['A 4 GB film download', formatDuration(c.filmSeconds)]]
            .map(([k, v]) => `<li><span>${k}</span><span class="v">${v}</span></li>`).join('')
        : '<li><span>Type a download speed in Mbps</span></li>';
}

function wireClose(): void {
    const input = $<HTMLInputElement>('speedInput'), btn = $<HTMLButtonElement>('qtRun'), note = $('qtNote');
    if (!input) return;
    input.addEventListener('input', () => renderExplorer(input));
    document.fonts.ready.then(() => renderExplorer(input));
    renderExplorer(input);
    btn?.addEventListener('click', async () => {
        if (!note) return;
        btn.disabled = true;
        btn.textContent = 'Measuring…';
        note.textContent = 'Measuring ping, then download…';
        try {
            const r = await quickTest(m => { note.innerHTML = `Download <b>${fmtSpeed(m)} Mbps</b> so far…`; });
            note.innerHTML = `This browser: download <b>${fmtSpeed(r.mbps)} Mbps</b>, ping ${r.ping.toFixed(0)} ms.`;
            input.value = String(Math.round(r.mbps));
            renderExplorer(input);
        } catch {
            note.textContent = 'The test server could not be reached from here. Install MeterX to test from your toolbar.';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Measure again';
        }
    });
}

// Buttons inside the demo pages that would open other extension pages go to the matching site page instead.
window.addEventListener('message', e => {
    if (e.origin !== location.origin) return;
    if (e.data?.mxDemo === 'openOptions') location.href = '/features/#settings';
    if (e.data?.mxDemo === 'openSidePanel') location.href = '/features/#history';
});

// The scroll engine is a classic script loaded before this module; starting it here keeps the page free of inline script (CSP).
(window as unknown as { ScrollCraft?: { mount(root: HTMLElement): void } }).ScrollCraft?.mount(document.body);
wireHero();
wireClose();
