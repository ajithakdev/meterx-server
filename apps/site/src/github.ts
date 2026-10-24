/**
 * Reads public data about the MeterX repo from the GitHub API, cached for the visit.
 * @license AGPL-3.0
 */

export const REPO = 'ajithakdev/meterx';

export interface Issue { number: number; title: string; url: string; labels: string[] }
export interface Contributor { login: string; avatar: string; url: string; contributions: number }

/** The site never shows em or en dashes, even when an issue title has them. */
const noDashes = (s: string) => s.replace(/\s*[\u2013\u2014]\s*/g, ', ');

/** Open issues only: the issues endpoint also returns pull requests, which carry a pull_request key. */
export function toIssues(raw: unknown): Issue[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(i => i && !i.pull_request && typeof i.number === 'number')
        .map(i => ({ number: i.number, title: noDashes(String(i.title)), url: String(i.html_url), labels: (i.labels ?? []).map((l: { name: string }) => l.name) }));
}

/** People only: bots and anonymous entries are left out. */
export function toContributors(raw: unknown): Contributor[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(c => c && c.type === 'User' && typeof c.login === 'string')
        .map(c => ({ login: c.login, avatar: `${c.avatar_url}&s=96`, url: c.html_url, contributions: c.contributions }));
}

/** GET from the GitHub API, cached in sessionStorage so a visit costs one request per endpoint (the limit is 60 an hour). */
export async function gh<T>(path: string): Promise<T> {
    const key = `gh:${path}`;
    try { const hit = sessionStorage.getItem(key); if (hit) return JSON.parse(hit) as T; } catch { /* storage blocked */ }
    const res = await fetch(`https://api.github.com/${path}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const data = await res.json() as T;
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* storage blocked */ }
    return data;
}
