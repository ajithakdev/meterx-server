/**
 * Shareable result URL. v1 = hash-encoded payload, no server needed.
 * A public viewer page at share target can later decode this fragment.
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';

const SHARE_VIEWER = 'https://meterx.dev/share';

export function buildShareUrl(entry: HistoryEntry): string {
    const compact = {
        t: entry.timestamp,
        dl: roundOrNull(entry.downloadSpeed, 1),
        ul: roundOrNull(entry.uploadSpeed, 1),
        p:  roundOrNull(entry.ping, 1),
        j:  roundOrNull(entry.jitter, 1),
        l:  roundOrNull(entry.packetLoss, 1),
        bb: entry.bufferbloatGrade ?? null,
        e:  entry.edge ?? null,
    };
    const encoded = base64UrlEncode(JSON.stringify(compact));
    return `${SHARE_VIEWER}#r=${encoded}`;
}

export function parseShareUrl(url: string): HistoryEntry | null {
    try {
        const hash = new URL(url).hash;
        const match = hash.match(/r=([A-Za-z0-9_-]+)/);
        if (!match) return null;
        const json = base64UrlDecode(match[1]);
        const c = JSON.parse(json);
        return {
            timestamp: c.t,
            downloadSpeed: c.dl ?? undefined,
            uploadSpeed:   c.ul ?? undefined,
            ping:          c.p  ?? undefined,
            jitter:        c.j  ?? undefined,
            packetLoss:    c.l  ?? undefined,
            bufferbloatGrade: c.bb ?? undefined,
            edge: c.e ?? undefined,
        };
    } catch {
        return null;
    }
}

function roundOrNull(v: number | undefined, d: number): number | null {
    if (v === undefined) return null;
    return Number(v.toFixed(d));
}

function base64UrlEncode(s: string): string {
    return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
    const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
    const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(escape(atob(b64)));
}
