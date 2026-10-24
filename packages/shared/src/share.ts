/**
 * Share links: the result is base64url JSON in the URL fragment, so it never
 * reaches a server. The viewer lives at SHARE_VIEWER (apps/site/public/r/).
 * @license AGPL-3.0
 */

import type { Grade, HistoryEntry } from './index';

export const SHARE_VIEWER = 'https://meterx.ajithakdev.com/r/'; // SITE_ORIGIN + '/r/'

type Shared = Pick<HistoryEntry, 'timestamp' | 'downloadSpeed' | 'uploadSpeed' | 'ping' | 'jitter' | 'packetLoss' | 'bufferbloatGrade' | 'edge' | 'isp'>;

export function buildShareUrl(entry: Shared): string {
    const r1 = (v: number | undefined) => (v === undefined ? null : Math.round(v * 10) / 10);
    const compact = {
        t: entry.timestamp,
        dl: r1(entry.downloadSpeed),
        ul: r1(entry.uploadSpeed),
        p: r1(entry.ping),
        j: r1(entry.jitter),
        l: r1(entry.packetLoss),
        bb: entry.bufferbloatGrade ?? null,
        e: entry.edge ?? null,
        i: entry.isp ?? null,
    };
    return `${SHARE_VIEWER}#r=${base64UrlEncode(JSON.stringify(compact))}`;
}

/** Decodes and validates a share link. Anything out of range is dropped, never trusted. */
export function parseShareUrl(url: string): Shared | null {
    try {
        const match = new URL(url).hash.match(/r=([A-Za-z0-9_-]+)/);
        if (!match) return null;
        const c = JSON.parse(base64UrlDecode(match[1])) as Record<string, unknown>;
        const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : undefined);
        const str = (v: unknown, re: RegExp) => (typeof v === 'string' && re.test(v) ? v : undefined);
        const t = num(c.t, 8.64e15);
        if (t === undefined) return null;
        return {
            timestamp: t,
            downloadSpeed: num(c.dl, 100_000),
            uploadSpeed: num(c.ul, 100_000),
            ping: num(c.p, 60_000),
            jitter: num(c.j, 60_000),
            packetLoss: num(c.l, 100),
            bufferbloatGrade: str(c.bb, /^[A-DF]$/) as Grade | undefined,
            edge: str(c.e, /^[A-Z]{3}$/),
            isp: str(c.i, /^[\p{L}\p{N} .,&()'/-]{1,64}$/u),
        };
    } catch {
        return null;
    }
}

function base64UrlEncode(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
    return new TextDecoder().decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)));
}
