/**
 * Where MeterX is listed. An empty url means the listing is not live yet; buttons then point at the install list.
 * @license AGPL-3.0
 */

export type StoreId = 'firefox' | 'edge' | 'opera' | 'chrome';

export const STORES: Record<StoreId, { name: string; url: string }> = {
    firefox: { name: 'Firefox', url: 'https://addons.mozilla.org/firefox/addon/meterx-by-ajithakdev/' },
    edge: { name: 'Edge', url: '' }, // shortcut: fill in from the Edge Add-ons listing
    opera: { name: 'Opera', url: '' }, // shortcut: fill in from the Opera Add-ons listing
    chrome: { name: 'Chrome', url: '' }, // not listed yet
};

/** The visitor's browser, from the user agent. Order matters: Edge and Opera also say "Chrome". */
export function detectStore(ua: string): StoreId | null {
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\//.test(ua)) return 'opera';
    if (/Chrome\//.test(ua)) return 'chrome';
    return null;
}
