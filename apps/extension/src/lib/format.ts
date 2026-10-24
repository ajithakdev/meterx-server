/**
 * Formatting helpers.
 * @license AGPL-3.0
 */

/** Shown for a missing value. A plain hyphen: the product never uses em or en dashes. */
export const NONE = '-';

/** Fixed decimals, or NONE for a missing value. */
export function fmt(v: number | undefined, d: number): string {
    return v !== undefined && Number.isFinite(v) ? v.toFixed(d) : NONE;
}

/** Speeds: one decimal under 100 Mbps, whole numbers above, so the figure stays short. */
export function fmtSpeed(v: number | undefined): string {
    return fmt(v, v !== undefined && v >= 100 ? 0 : 1);
}

/** YYYY-MM-DD in the browser's own time zone, for file names. */
export function localDate(d = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function getTimeAgo(date: Date): string {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/** "Today 14:05", "Yesterday 09:12", "3 Oct 18:40". */
export function fmtWhen(ts: number, now = Date.now()): string {
    const d = new Date(ts);
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((day(new Date(now)) - day(d)) / 86_400_000);
    if (diff === 0) return `Today ${time}`;
    if (diff === 1) return `Yesterday ${time}`;
    return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${time}`;
}
