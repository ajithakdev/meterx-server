/**
 * Share viewer: the result lives in the link's hash, so it never reaches a server.
 * @license AGPL-3.0
 */

import { parseShareUrl, qualityOf } from '@meterx/shared';

const $ = (id: string) => document.getElementById(id);
const fmt = (v: number | undefined, d: number) => (v === undefined ? null : v.toFixed(d));
const speed = (v: number | undefined) => (v === undefined ? null : v >= 100 ? v.toFixed(0) : v.toFixed(1));

function set(id: string, v: string | null): void {
    const el = $(id);
    if (!el) return;
    if (v === null) { el.textContent = '-'; el.classList.add('dash'); } else { el.textContent = v; el.classList.remove('dash'); }
}

const r = parseShareUrl(location.href);
if (r) {
    $('empty')!.hidden = true;
    $('result')!.hidden = false;
    set('down', speed(r.downloadSpeed));
    set('up', speed(r.uploadSpeed));
    set('ping', fmt(r.ping, 0));
    set('jitter', fmt(r.jitter, 1));
    set('loss', fmt(r.packetLoss, 1));
    const when = new Date(r.timestamp);
    $('when')!.textContent = `${when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    const where = [r.isp, r.edge ? `Cloudflare ${r.edge}` : ''].filter(Boolean).join(' · ');
    $('where')!.textContent = where;
    const q = qualityOf(r);
    const pill = $('quality')!;
    if (q) { pill.textContent = q.label; pill.className = `pill q-${q.cls}`; } else pill.hidden = true;
    const grade = $('grade')!;
    if (r.bufferbloatGrade) grade.textContent = `Load grade ${r.bufferbloatGrade}`; else grade.hidden = true;
    document.title = `${speed(r.downloadSpeed) ?? '-'} Mbps on MeterX`;
}
