/**
 * MeterX Shared Types
 * @license AGPL-3.0
 */

export type Quality = 'excellent' | 'good' | 'fair' | 'poor';

export interface TestProgress {
    status?: string;
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
    bufferbloatDelta?: number;
    dnsLookupMs?: number;
}

export interface TestResults {
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
    bufferbloatDelta?: number;
    bufferbloatGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
    dnsLookupMs?: number;
    ipv4Ok?: boolean;
    ipv6Ok?: boolean;
    status: string;
    serverUrl?: string;
    edge?: string;
    timestamp?: number;
}

export interface PingResult {
    ping: number;
    jitter: number;
    packetLoss: number;
    samples?: number[];
}

export interface HealthResponse {
    status: 'ok' | 'degraded';
    server: 'cloudflare-worker' | 'express';
    version?: string;
    edge?: string;
    timestamp: number;
}

export interface HistoryEntry {
    id?: string;
    timestamp: number;
    downloadSpeed?: number;
    uploadSpeed?: number;
    ping?: number;
    jitter?: number;
    packetLoss?: number;
    bufferbloatDelta?: number;
    bufferbloatGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
    dnsLookupMs?: number;
    ipv4Ok?: boolean;
    ipv6Ok?: boolean;
    edge?: string;
}

export interface IspPlan {
    downloadMbps: number;
    uploadMbps: number;
    providerName?: string;
}

export const QUALITY_THRESHOLDS = {
    excellent: { download: 100, upload: 20, ping: 30, jitter: 10, packetLoss: 0.5 },
    good:      { download: 25,  upload: 5,  ping: 60, jitter: 20, packetLoss: 1   },
    fair:      { download: 5,   upload: 1,  ping: 120, jitter: 40, packetLoss: 3  },
} as const;

export const USE_CASE_REQUIREMENTS = {
    calls:     { minDownload: 1,  minUpload: 1,  maxPing: 150, maxJitter: 30, maxPacketLoss: 1 },
    streaming: { minDownload: 5,  minUpload: 0,  maxPing: 200, maxJitter: 60, maxPacketLoss: 2 },
    gaming:    { minDownload: 3,  minUpload: 1,  maxPing: 50,  maxJitter: 15, maxPacketLoss: 0.5 },
    uploads:   { minDownload: 0,  minUpload: 5,  maxPing: 200, maxJitter: 60, maxPacketLoss: 2 },
} as const;
