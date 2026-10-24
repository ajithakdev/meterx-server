/**
 * MeterX shared contract: types, API constants and helpers used by the
 * extension, the Cloudflare Worker and the Express server.
 * @license AGPL-3.0
 */

import pkg from '../../../package.json';

/** Single source of truth for the version, read from the root package.json. */
export const VERSION: string = pkg.version;

// --- Server API contract ---

export const ALLOWED_SIZES_MB = [1, 5, 10, 25] as const;
export const TEST_FILE_RE = /^(1|5|10|25)MB\.bin$/;
/** Bodies above this are cut off by both backends; the extension never sends more than 8 MB. */
export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;

/** The default test server. Also listed in the extension's manifest host_permissions and the site's CSP; change all three together. */
export const WORKER_URL = 'https://meterx-speedtest.meterx-ajithakdev.workers.dev';

/** The product site, which runs a short in-page test against the worker. */
export const SITE_ORIGIN = 'https://meterx.ajithakdev.com';

/** Origins the backends answer with CORS: extensions, the site, and the site's local dev server. */
export function isAllowedOrigin(origin: string | null | undefined): boolean {
    return isExtensionOrigin(origin) || origin === SITE_ORIGIN || /^http:\/\/localhost:\d+$/.test(origin ?? '');
}

/** Browser extension origins (Chrome, Edge, Opera, Firefox, Safari). Never `null`. */
export function isExtensionOrigin(origin: string | null | undefined): boolean {
    return !!origin && /^(chrome|moz|safari-web)-extension:\/\/[\w.-]+$/.test(origin);
}

export function ipFamily(ip: string): 'ipv4' | 'ipv6' | 'unknown' {
    if (ip.includes(':')) return ip.startsWith('::ffff:') && /\d+\.\d+\.\d+\.\d+$/.test(ip) ? 'ipv4' : 'ipv6';
    return /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? 'ipv4' : 'unknown';
}

export interface HealthResponse {
    status: 'ok';
    server: 'cloudflare-worker' | 'express';
    version: string;
    edge?: string;
    timestamp: number;
}

/** `GET /ip`: connection facts the server can see. Nothing is stored. */
export interface IpInfo {
    ip: string;
    family: 'ipv4' | 'ipv6' | 'unknown';
    isp?: string;
    edge?: string;
    city?: string;
    country?: string;
}

// --- Measurement results ---

export type Quality = 'excellent' | 'good' | 'fair' | 'poor';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';
export type Phase = 'connect' | 'download' | 'upload' | 'latency' | 'done';

export interface TestProgress {
    phase?: Phase;
    status?: string;
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
}

export interface TestResults {
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
    /** Loaded latency minus idle latency, worst of download and upload. */
    bufferbloatDelta?: number;
    bufferbloatGrade?: Grade;
    loadedPingDown?: number;
    loadedPingUp?: number;
    dnsLookupMs?: number;
    ipv4Ok?: boolean;
    ipv6Ok?: boolean;
    edge?: string;
    isp?: string;
    serverUrl?: string;
    timestamp?: number;
}

export type HistoryEntry = Omit<TestResults, 'serverUrl'> & { timestamp: number };

export interface IspPlan {
    downloadMbps: number;
    uploadMbps: number;
    providerName?: string;
}

/** Messages the service worker broadcasts to extension pages. */
export type BroadcastMessage =
    | { action: 'testProgress'; data: TestProgress }
    | { action: 'testComplete'; data: HistoryEntry }
    | { action: 'testError'; error: string; cancelled?: boolean };

export { SHARE_VIEWER, buildShareUrl, parseShareUrl } from './share';
export { NONE, fmt, fmtSpeed, localDate, getTimeAgo, fmtWhen } from './format';
export { median, gradeBufferbloat, planShare } from './stats';
export { getQuality, qualityOf, scoreUseCases, USE_CASES, type QualityLabel, type UseCaseScore, type UseCaseScores } from './quality';
