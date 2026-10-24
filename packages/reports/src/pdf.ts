/**
 * PDF report, drawn as vector text and shapes with jsPDF (loaded on demand).
 * Same design as the app: ink and grey on white, one blue for download,
 * status colour only on pills. Colours mirror the light tokens in static/styles/app.css.
 * @license AGPL-3.0
 */

import { NONE, USE_CASES, VERSION, fmt, fmtSpeed, planShare, qualityOf, type Grade, type HistoryEntry, type IspPlan, type UseCaseScore } from '@meterx/shared';
import type { jsPDF as JsPdf } from 'jspdf';
import { summarize, type Spread, type Summary } from './stats';

const C = {
    text: '#0a0a0a', muted: '#5b6068', border: '#e1e4e8', rule: '#eceef1', raised: '#eaedf1',
    data: '#1d5fbf', second: '#8a8f96', grid: '#e6e8eb',
};
type Tone = 'positive' | 'warning' | 'negative' | 'neutral';
const PILL: Record<Tone, [bg: string, ink: string]> = {
    positive: ['#dcfae5', '#04250e'], warning: ['#fff4d6', '#7a3a0b'], negative: ['#ffedea', '#831c1e'], neutral: ['#eaedf1', '#3d4148'],
};
const scoreTone: Record<UseCaseScore, Tone> = { good: 'positive', okay: 'warning', poor: 'negative' };
const gradeTone = (g: Grade): Tone => (g === 'A' || g === 'B' ? 'positive' : g === 'C' ? 'warning' : 'negative');
const qualityTone = (cls: string): Tone => (cls === 'excellent' || cls === 'good' ? 'positive' : cls === 'fair' ? 'warning' : 'negative');

const PAGE_W = 210, PAGE_H = 297, M = 16, W = PAGE_W - 2 * M, FOOT_Y = PAGE_H - 10, BOTTOM = FOOT_Y - 8;

const day = (ts: number) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const when = (ts: number) => `${new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
const range = (s: Spread | null, f: (v: number) => string) => (s && s.n > 1 ? `${f(s.min)} to ${f(s.max)}` : '');

/** Builds the report (history newest first, as stored). Split from the download so it can be tested. */
export async function buildReport(hist: HistoryEntry[], plan: IspPlan | null, now = Date.now()): Promise<JsPdf> {
    const { jsPDF, GState } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const id = await reportId(hist);
    doc.setProperties({ title: 'MeterX connection report', subject: `Report ID ${id}`, creator: `MeterX ${VERSION}`, keywords: `meterx ${id}` });
    const s = summarize(hist);
    const d = new Draw(doc);

    let y = header(d, s, now);
    y = intro(d, s, plan, y);
    y = answer(d, s, y);
    y = strip(d, s, y);
    y = loadAndReady(d, s, y);
    if (plan && (plan.downloadMbps > 0 || plan.uploadMbps > 0)) y = planCard(d, s, plan, y);
    y = chart(d, hist, y);
    results(d, hist, y);
    footers(d, id, new GState({ opacity: 0.045 }), new GState({ opacity: 1 }));
    return doc;
}

/**
 * Short fingerprint of the measurements (time and every figure), shown on each page.
 * The same results always give the same ID, so a figure changed in an edited copy no longer matches
 * a fresh export. shortcut: not a signature, anyone can recompute it; sign server-side if reports need proof.
 */
export async function reportId(hist: HistoryEntry[]): Promise<string> {
    const data = JSON.stringify(hist.map(e => [e.timestamp, e.downloadSpeed, e.uploadSpeed, e.ping, e.jitter, e.packetLoss, e.bufferbloatDelta]));
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data)));
    const hex = [...hash.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hex.match(/.{4}/g)!.join('-');
}

/** Thin wrapper so every call sets font, size and colour together. */
class Draw {
    constructor(readonly doc: JsPdf) {}
    text(t: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center' } = {}): void {
        this.doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
        this.doc.setFontSize(o.size ?? 9);
        this.doc.setTextColor(o.color ?? C.text);
        this.doc.text(t, x, y, { align: o.align ?? 'left' });
    }
    width(t: string, size: number, bold = false): number {
        this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
        this.doc.setFontSize(size);
        return this.doc.getTextWidth(t);
    }
    card(x: number, y: number, w: number, h: number): void {
        this.doc.setDrawColor(C.border);
        this.doc.setLineWidth(0.25);
        this.doc.roundedRect(x, y, w, h, 2, 2, 'S');
    }
    rule(x1: number, y: number, x2: number, color = C.rule): void {
        this.doc.setDrawColor(color);
        this.doc.setLineWidth(0.25);
        this.doc.line(x1, y, x2, y);
    }
    bar(x: number, y: number, w: number, h: number, color: string): void {
        if (w <= 0) return;
        this.doc.setFillColor(color);
        this.doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
    }
    /** A status pill on baseline `y`; `x` is its right edge when right-aligned. */
    pill(label: string, x: number, y: number, tone: Tone, alignRight = false): void {
        const [bg, ink] = PILL[tone];
        const w = this.width(label, 7.5, true) + 4.4;
        const left = alignRight ? x - w : x;
        this.doc.setFillColor(bg);
        this.doc.roundedRect(left, y - 3.6, w, 5, 2.5, 2.5, 'F');
        this.text(label, left + 2.2, y, { size: 7.5, bold: true, color: ink });
    }
    /** Figure with a smaller muted unit after it. */
    figure(value: string, unit: string, x: number, y: number, size: number, color = C.text): void {
        this.text(value, x, y, { size, bold: true, color });
        this.text(unit, x + this.width(value, size, true) + 1, y, { size: Math.max(7, size * 0.42), color: C.muted });
    }
    /** The MeterX mark: a dial with download and upload arrows crossing into an X, centred on (x, y), dial radius r. */
    mark(x: number, y: number, r: number): void {
        const doc = this.doc, k = r / 43;
        const P = (gx: number, gy: number): [number, number] => [x + (gx - 64) * k, y + (gy - 64) * k];
        const path = (pts: Array<[number, number]>, color: string, w: number) => {
            doc.setDrawColor(color).setLineWidth(w * k);
            for (let i = 1; i < pts.length; i++) doc.line(...P(...pts[i - 1]), ...P(...pts[i]));
        };
        doc.setLineCap('round').setLineJoin('round');
        const from = (135 * Math.PI) / 180, to = (405 * Math.PI) / 180, steps = 28;
        path(Array.from({ length: steps + 1 }, (_, i) => {
            const a = from + ((to - from) * i) / steps;
            return [64 + 43 * Math.cos(a), 64 + 43 * Math.sin(a)] as [number, number];
        }), '#cdd2d8', 8);
        path([[46, 46], [78, 78]], C.data, 10);
        path([[84, 64], [84, 84], [64, 84]], C.data, 10);
        path([[48, 80], [80, 48]], '#ffffff', 20); // the gap where upload crosses download
        path([[48, 80], [80, 48]], C.text, 10);
        path([[62, 46], [82, 46], [82, 66]], C.text, 10);
    }
}

function header(d: Draw, s: Summary, now: number): number {
    d.mark(M + 3.2, 19, 3.2);
    d.text('MeterX', M + 9, 18.6, { size: 11, bold: true });
    d.text('Internet speed and quality', M + 9, 22.6, { size: 7.5, color: C.muted });
    d.text(`Generated ${day(now)}, ${new Date(now).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`, M + W, 18.6, { size: 7.5, color: C.muted, align: 'right' });
    const period = day(s.from) !== day(s.to) ? `${day(s.from)} to ${day(s.to)}` : day(s.to);
    d.text(`${period} · ${s.count} test${s.count === 1 ? '' : 's'}`, M + W, 22.6, { size: 7.5, color: C.muted, align: 'right' });
    d.rule(M, 27, M + W, C.border);
    return 38;
}

function intro(d: Draw, s: Summary, plan: IspPlan | null, y: number): number {
    d.text('Connection report', M, y, { size: 18, bold: true });
    const parts: string[] = [];
    if (s.download) {
        let p = `Download averaged ${fmtSpeed(s.download.avg)} Mbps over ${s.count} test${s.count === 1 ? '' : 's'}`;
        const share = plan ? planShare(s.download.avg, plan.downloadMbps) : null;
        p += share !== null ? `, ${Math.round(share)}% of your ${plan!.downloadMbps} Mbps plan.` : '.';
        parts.push(p);
    }
    if (s.upload && s.ping) parts.push(`Upload averaged ${fmtSpeed(s.upload.avg)} Mbps and ping was typically ${fmt(s.ping.median, 0)} ms.`);
    if (s.trend !== null) {
        parts.push(Math.abs(s.trend) < 5 ? 'Download speed held steady across the period.'
            : `Download speed ${s.trend > 0 ? 'rose' : 'fell'} ${Math.abs(Math.round(s.trend))}% from the first half of the period to the second.`);
    }
    d.doc.setFont('helvetica', 'normal').setFontSize(10);
    const lines = d.doc.splitTextToSize(parts.join(' '), W * 0.85) as string[];
    lines.forEach((l, i) => d.text(l, M, y + 7.5 + i * 5, { size: 10, color: C.muted }));
    return y + 7.5 + (lines.length - 1) * 5 + 7;
}

function answer(d: Draw, s: Summary, y: number): number {
    const h = 32;
    d.card(M, y, W, h);
    d.text('Download, average', M + 6, y + 8.5, { size: 9, color: C.muted });
    if (s.quality) d.pill(s.quality.label, M + W - 6, y + 8.5, qualityTone(s.quality.cls), true);
    d.figure(s.download ? fmtSpeed(s.download.avg) : NONE, 'Mbps', M + 6, y + 22, 30, C.data);
    const notes = [range(s.download, fmtSpeed) && `Range ${range(s.download, fmtSpeed)} Mbps`,
        s.count > 1 ? `Steadiness ${Math.round(s.steadiness)}%` : ''].filter(Boolean).join(' · ');
    if (notes) d.text(notes, M + 6, y + 28, { size: 7.5, color: C.muted });
    return y + h + 4;
}

function strip(d: Draw, s: Summary, y: number): number {
    const h = 22, cw = W / 4;
    const cells: Array<[string, Spread | null, 'avg' | 'median', string, (v: number) => string]> = [
        ['Upload, average', s.upload, 'avg', 'Mbps', fmtSpeed],
        ['Ping, median', s.ping, 'median', 'ms', v => fmt(v, 0)],
        ['Jitter, median', s.jitter, 'median', 'ms', v => fmt(v, 1)],
        ['Packet loss, average', s.loss, 'avg', '%', v => fmt(v, 1)],
    ];
    d.card(M, y, W, h);
    cells.forEach(([label, sp, k, unit, f], i) => {
        const x = M + i * cw + 5;
        if (i) { d.doc.setDrawColor(C.rule); d.doc.line(M + i * cw, y + 3, M + i * cw, y + h - 3); }
        d.text(label, x, y + 6.5, { size: 7.5, color: C.muted });
        d.figure(sp ? f(sp[k]) : NONE, unit, x, y + 14, 15);
        const r = range(sp, f);
        if (r) d.text(r, x, y + 19, { size: 6.5, color: C.muted });
    });
    return y + h + 4;
}

function loadAndReady(d: Draw, s: Summary, y: number): number {
    const h = 40, w = (W - 4) / 2;
    d.card(M, y, w, h);
    d.text('Latency under load', M + 5, y + 7.5, { size: 10, bold: true });
    if (s.grade) d.pill(`Grade ${s.grade}`, M + w - 5, y + 7.5, gradeTone(s.grade), true);
    const rows: Array<[string, number | undefined, string]> = [
        ['Idle', s.ping?.median, C.text], ['Downloading', s.loadedPingDown?.median, C.second], ['Uploading', s.loadedPingUp?.median, C.second],
    ];
    const max = Math.max(1, ...rows.map(r => r[1] ?? 0));
    const bx = M + 27, bw = w - 50;
    rows.forEach(([label, v, color], i) => {
        const ry = y + 16 + i * 7;
        d.text(label, M + 5, ry, { size: 8.5, color: C.muted });
        d.bar(bx, ry - 2, bw, 1.8, C.raised);
        if (v !== undefined) d.bar(bx, ry - 2, Math.max(1.8, (bw * v) / max), 1.8, color);
        d.text(v === undefined ? NONE : `${fmt(v, 0)} ms`, M + w - 5, ry, { size: 8.5, align: 'right' });
    });
    d.text('Median ping in each phase. A big jump under load means bufferbloat.', M + 5, y + h - 4, { size: 6.5, color: C.muted });

    const x = M + w + 4;
    d.card(x, y, w, h);
    d.text('Good enough for', x + 5, y + 7.5, { size: 10, bold: true });
    USE_CASES.forEach((u, i) => {
        const ry = y + 16 + i * 6.4;
        d.text(u.label, x + 5, ry, { size: 8.5 });
        const score = s.useCases?.[u.key];
        if (score) d.pill(u.words[score], x + w - 5, ry, scoreTone[score], true);
        else d.text(NONE, x + w - 5, ry, { size: 8.5, color: C.muted, align: 'right' });
    });
    return y + h + 4;
}

function planCard(d: Draw, s: Summary, plan: IspPlan, y: number): number {
    const rows = ([['Download', s.download?.avg, plan.downloadMbps, C.data], ['Upload', s.upload?.avg, plan.uploadMbps, C.second]] as const)
        .filter(r => r[2] > 0);
    const h = 10 + rows.length * 11;
    d.card(M, y, W, h);
    d.text(`Against your plan${plan.providerName ? ` (${plan.providerName})` : ''}`, M + 5, y + 7.5, { size: 10, bold: true });
    rows.forEach(([label, got, planned, color], i) => {
        const ry = y + 15 + i * 11;
        const share = planShare(got, planned);
        d.text(label, M + 5, ry, { size: 8.5, color: C.muted });
        d.text(`${got === undefined ? NONE : fmtSpeed(got)} of ${planned} Mbps${share !== null ? ` · ${Math.round(share)}%` : ''}`, M + W - 5, ry, { size: 8.5, bold: true, align: 'right' });
        const bw = W - 10, scale = Math.max(planned, got ?? 0);
        d.bar(M + 5, ry + 2, bw, 2, C.raised);
        if (got !== undefined) d.bar(M + 5, ry + 2, Math.max(2, (bw * got) / scale), 2, color);
        d.doc.setFillColor(C.text);
        d.doc.rect(M + 5 + (bw * planned) / scale - 0.3, ry + 1, 0.6, 4, 'F');
    });
    return y + h + 4;
}

function chart(d: Draw, hist: HistoryEntry[], y: number): number {
    const pts = [...hist].reverse().filter(e => e.downloadSpeed !== undefined);
    const h = pts.length < 2 ? 22 : 66;
    if (y + h > BOTTOM) { d.doc.addPage(); y = M; }
    d.card(M, y, W, h);
    d.text('Speed over time', M + 5, y + 7.5, { size: 10, bold: true });
    if (pts.length < 2) {
        d.text('Run at least two tests to draw the trend.', M + 5, y + 15, { size: 9, color: C.muted });
        return y + h + 4;
    }
    let lx = M + W - 5;
    for (const [label, color] of [['Upload', C.second], ['Download', C.data]] as const) {
        d.text(label, lx, y + 7.5, { size: 7.5, color: C.muted, align: 'right' });
        lx -= d.width(label, 7.5) + 1.5;
        d.bar(lx - 4, y + 6.1, 4, 0.9, color);
        lx -= 8;
    }
    const px = M + 15, pw = W - 21, py = y + 15, ph = h - 26;
    const top = niceMax(Math.max(...pts.map(e => Math.max(e.downloadSpeed ?? 0, e.uploadSpeed ?? 0))));
    for (let i = 0; i <= 4; i++) {
        const gy = py + ph - (ph * i) / 4;
        d.rule(px, gy, px + pw, C.grid);
        d.text(fmt((top * i) / 4, 0), px - 2, gy + 1, { size: 6.5, color: C.muted, align: 'right' });
    }
    d.text('Mbps', px - 2, py - 4, { size: 6.5, color: C.muted, align: 'right' });
    const t0 = pts[0].timestamp, t1 = pts[pts.length - 1].timestamp, span = Math.max(1, t1 - t0);
    const X = (t: number) => px + (pw * (t - t0)) / span;
    const Y = (v: number) => py + ph - (ph * v) / top;
    const line = (k: 'downloadSpeed' | 'uploadSpeed', color: string, width: number) => {
        const p = pts.filter(e => e[k] !== undefined);
        d.doc.setDrawColor(color);
        d.doc.setLineWidth(width);
        d.doc.setLineJoin('round');
        for (let i = 1; i < p.length; i++) d.doc.line(X(p[i - 1].timestamp), Y(p[i - 1][k]!), X(p[i].timestamp), Y(p[i][k]!));
    };
    line('uploadSpeed', C.second, 0.45);
    line('downloadSpeed', C.data, 0.7);
    const sameDay = day(t0) === day(t1);
    const label = (t: number) => (sameDay ? new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }));
    d.text(label(t0), px, py + ph + 5, { size: 6.5, color: C.muted });
    d.text(label(t0 + span / 2), px + pw / 2, py + ph + 5, { size: 6.5, color: C.muted, align: 'center' });
    d.text(label(t1), px + pw, py + ph + 5, { size: 6.5, color: C.muted, align: 'right' });
    return y + h + 4;
}

/** Round an axis maximum up to a value whose quarters are round numbers. */
export function niceMax(v: number): number {
    if (!(v > 0)) return 10;
    const p = 10 ** Math.floor(Math.log10(v));
    return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(m => m * p >= v) ?? 10) * p;
}

const COLS: Array<{ label: string; w: number; right?: boolean }> = [
    { label: 'When', w: 30 }, { label: 'Down Mbps', w: 21, right: true }, { label: 'Up Mbps', w: 19, right: true },
    { label: 'Ping ms', w: 18, right: true }, { label: 'Jitter ms', w: 19, right: true }, { label: 'Loss %', w: 16, right: true },
    { label: 'Load grade', w: 21, right: true }, { label: 'Quality', w: 34, right: true },
];

function results(d: Draw, hist: HistoryEntry[], y: number): void {
    const ROW = 7;
    const head = (yy: number, cont: boolean) => {
        d.text(cont ? 'Results (continued)' : 'Results', M, yy, { size: 10, bold: true });
        let x = M;
        for (const c of COLS) {
            d.text(c.label, c.right ? x + c.w : x, yy + 8, { size: 7, color: C.muted, align: c.right ? 'right' : 'left' });
            x += c.w;
        }
        d.rule(M, yy + 10.5, M + W, C.border);
        return yy + 10.5;
    };
    y = y + 10.5 + ROW * 3 > BOTTOM ? (d.doc.addPage(), M + 4) : y + 4;
    y = head(y, false);
    for (const e of hist) {
        if (y + ROW > BOTTOM) { d.doc.addPage(); y = head(M + 4, true); }
        const q = qualityOf(e);
        const cells = [when(e.timestamp), fmtSpeed(e.downloadSpeed), fmtSpeed(e.uploadSpeed), fmt(e.ping, 0), fmt(e.jitter, 1), fmt(e.packetLoss, 1), e.bufferbloatGrade ?? NONE];
        const by = y + ROW - 2.2;
        let x = M;
        cells.forEach((t, i) => {
            const c = COLS[i];
            d.text(t, c.right ? x + c.w : x, by, { size: 8, color: i === 0 ? C.muted : i === 1 ? C.data : C.text, bold: i === 1, align: c.right ? 'right' : 'left' });
            x += c.w;
        });
        if (q) d.pill(q.label, M + W, by, qualityTone(q.cls), true);
        y += ROW;
        d.rule(M, y, M + W);
    }
}

/** Footer and a faint diagonal brand mark on every page. */
function footers(d: Draw, id: string, faint: unknown, solid: unknown): void {
    const n = d.doc.getNumberOfPages();
    const gs = (g: unknown) => d.doc.setGState(g as Parameters<JsPdf['setGState']>[0]);
    for (let p = 1; p <= n; p++) {
        d.doc.setPage(p);
        gs(faint);
        d.doc.setFont('helvetica', 'bold').setFontSize(96).setTextColor(C.text);
        d.doc.text('MeterX', PAGE_W / 2 - 52, PAGE_H / 2 + 34, { angle: 35 });
        gs(solid);
        d.rule(M, FOOT_Y - 4, M + W, C.border);
        d.text(`MeterX v${VERSION} · Report ID ${id} · github.com/ajithakdev/meterx`, M, FOOT_Y, { size: 7, color: C.muted });
        d.text(`Page ${p} of ${n}`, M + W, FOOT_Y, { size: 7, color: C.muted, align: 'right' });
    }
}
