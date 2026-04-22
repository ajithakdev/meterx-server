/**
 * Tiny formatting helpers
 * @license AGPL-3.0
 */

export function fmt(v: number | undefined, d: number): string {
    return v !== undefined ? v.toFixed(d) : '--';
}

export function getTimeAgo(date: Date): string {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
