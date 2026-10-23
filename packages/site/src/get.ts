/**
 * /get: one link to share anywhere; sends each visitor to their own browser's store.
 * @license AGPL-3.0
 */

import { STORES, detectStore } from './stores';

const id = detectStore(navigator.userAgent);
const url = id ? STORES[id].url : '';
if (url) location.replace(url);
else document.getElementById('fallback')!.hidden = false;
