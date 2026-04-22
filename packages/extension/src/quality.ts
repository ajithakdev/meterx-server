/**
 * Quality scoring — shared between popup + PDF export
 * @license AGPL-3.0
 */

import type { Quality } from '@meterx/shared';

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

export function getQualityClass(dl?: number, ul?: number, ping?: number): string {
    if (dl === undefined || ul === undefined || ping === undefined) return 'q-fair';
    return 'q-' + getQuality(dl, ul, ping).cls;
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
