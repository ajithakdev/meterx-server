/**
 * Where MeterX is listed and where it is going. An empty url means the listing is not live yet.
 * @license AGPL-3.0
 */

export type StoreId = 'firefox' | 'edge' | 'opera' | 'chrome';

export const STORES: Record<StoreId, { name: string; url: string }> = {
    firefox: { name: 'Firefox', url: 'https://addons.mozilla.org/firefox/addon/meterx-by-ajithakdev/' },
    edge: { name: 'Edge', url: 'https://microsoftedge.microsoft.com/addons/detail/glkpolbkpachomgmmhdkmjnghejbhlfc' },
    opera: { name: 'Opera', url: '' }, // shortcut: fill in from the Opera Add-ons listing once it is public
    chrome: { name: 'Chrome', url: '' }, // not listed yet
};

/** Every place on the Get page, in dial order. `browsers` are the ones that install from that store. */
export interface Place { id: string; store: string; browsers: string; logo: string; colour: string; url: string; note: string }
export const PLACES: Place[] = [
    { id: 'firefox', store: 'Firefox Add-ons', browsers: 'Firefox on Windows, macOS and Linux', logo: 'firefoxbrowser', colour: '#FF7139', url: STORES.firefox.url, note: 'Live' },
    { id: 'edge', store: 'Microsoft Edge Add-ons', browsers: 'Microsoft Edge', logo: 'microsoftedge', colour: '#0C8DD7', url: STORES.edge.url, note: 'Live' },
    { id: 'opera', store: 'Opera Add-ons', browsers: 'Opera and Opera GX', logo: 'opera', colour: '#FF1B2D', url: STORES.opera.url, note: 'Listing link coming soon' },
    { id: 'chrome', store: 'Chrome Web Store', browsers: 'Chrome, plus Brave, Vivaldi and Arc', logo: 'googlechrome', colour: '#4285F4', url: STORES.chrome.url, note: 'Planned for the next release' },
    { id: 'brave', store: 'Brave', browsers: 'Installs from the Chrome Web Store', logo: 'brave', colour: '#FB542B', url: '', note: 'With the Chrome listing' },
    { id: 'vivaldi', store: 'Vivaldi', browsers: 'Installs from the Chrome Web Store', logo: 'vivaldi', colour: '#EF3939', url: '', note: 'With the Chrome listing' },
    { id: 'android', store: 'Firefox for Android', browsers: 'Firefox on Android phones and tablets', logo: 'firefoxbrowser', colour: '#FF7139', url: '', note: 'Planned' },
    { id: 'safari', store: 'Safari', browsers: 'Safari on macOS and iOS', logo: 'safari', colour: '#006CFF', url: '', note: 'Later: needs an Apple developer account' },
];

/** The visitor's browser, from the user agent. Order matters: Edge and Opera also say "Chrome". */
export function detectStore(ua: string): StoreId | null {
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Edg\//.test(ua)) return 'edge';
    if (/OPR\//.test(ua)) return 'opera';
    if (/Chrome\//.test(ua)) return 'chrome';
    return null;
}
