/**
 * What a download speed buys, using the extension's own thresholds: 25 Mbps for a 4K stream, 5 Mbps for HD.
 * @license AGPL-3.0
 */

export interface Capacity { streams4k: number; streamsHd: number; gameSeconds: number; filmSeconds: number }

const MBIT_PER_GB = 8000;

export function capacity(mbps: number): Capacity | null {
    if (!(mbps > 0) || mbps > 100_000) return null;
    return {
        streams4k: Math.floor(mbps / 25),
        streamsHd: Math.floor(mbps / 5),
        gameSeconds: (50 * MBIT_PER_GB) / mbps,
        filmSeconds: (4 * MBIT_PER_GB) / mbps,
    };
}

const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "45 seconds", "12 minutes", "1 hour 7 minutes". */
export function formatDuration(s: number): string {
    if (s < 90) return unit(Math.max(1, Math.round(s)), 'second');
    const m = Math.round(s / 60);
    if (m < 90) return unit(m, 'minute');
    const h = Math.floor(m / 60), rest = m % 60;
    return rest ? `${unit(h, 'hour')} ${unit(rest, 'minute')}` : unit(h, 'hour');
}
