/**
 * Quality grade and use-case readiness. The one copy of these rules (#67).
 * @license AGPL-3.0
 */

import type { HistoryEntry, Quality } from './index';

export interface QualityLabel {
    label: string;
    cls: Quality;
}

export function getQuality(dl: number, ul: number, ping: number): QualityLabel {
    if (dl >= 50 && ul >= 20 && ping < 30) return { label: 'Excellent', cls: 'excellent' };
    if (dl >= 20 && ul >= 10 && ping < 60) return { label: 'Good', cls: 'good' };
    if (dl >= 5 && ul >= 2 && ping < 150) return { label: 'Fair', cls: 'fair' };
    return { label: 'Poor', cls: 'poor' };
}

/** Grade of a stored result, or null when it is missing a measurement. */
export function qualityOf(e: Pick<HistoryEntry, 'downloadSpeed' | 'uploadSpeed' | 'ping'> | undefined): QualityLabel | null {
    if (!e || e.downloadSpeed === undefined || e.uploadSpeed === undefined || e.ping === undefined) return null;
    return getQuality(e.downloadSpeed, e.uploadSpeed, e.ping);
}


export type UseCaseScore = 'good' | 'okay' | 'poor';

export interface UseCaseScores {
    calls: UseCaseScore;
    stream: UseCaseScore;
    gaming: UseCaseScore;
    upload: UseCaseScore;
}

export function scoreUseCases(
    dl: number,
    ul: number,
    ping: number,
    jitter?: number,
    loss?: number,
): UseCaseScores {
    const j = jitter ?? 999;
    const l = loss ?? 100;
    return {
        calls:  (dl >= 5 && ul >= 3 && ping < 100 && j < 30) ? 'good' : (dl >= 2 && ul >= 1 && ping < 200) ? 'okay' : 'poor',
        stream: dl >= 25 ? 'good' : dl >= 5 ? 'okay' : 'poor',
        gaming: (ping < 50 && j < 20 && l < 1) ? 'good' : (ping < 100 && j < 40 && l < 3) ? 'okay' : 'poor',
        upload: ul >= 10 ? 'good' : ul >= 3 ? 'okay' : 'poor',
    };
}

/** Plain words for each use case, shared by the extension, its exports and the site. */
export const USE_CASES: Array<{ key: keyof UseCaseScores; label: string; words: Record<UseCaseScore, string> }> = [
    { key: 'calls', label: 'Video calls', words: { good: 'Smooth', okay: 'Choppy', poor: 'Too slow' } },
    { key: 'stream', label: 'Streaming', words: { good: '4K', okay: 'HD only', poor: 'Too slow' } },
    { key: 'gaming', label: 'Gaming', words: { good: 'Smooth', okay: 'May lag', poor: 'Laggy' } },
    { key: 'upload', label: 'Uploads', words: { good: 'Fast', okay: 'Slow', poor: 'Very slow' } },
];
