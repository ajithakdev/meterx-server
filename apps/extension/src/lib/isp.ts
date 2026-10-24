/**
 * The user's advertised ISP plan, in chrome.storage.sync.
 * @license AGPL-3.0
 */

/// <reference types="chrome" />

import type { IspPlan } from '@meterx/shared';

const KEY = 'ispPlan';

export async function loadIspPlan(): Promise<IspPlan | null> {
    const r = await chrome.storage.sync.get(KEY);
    const plan = r[KEY] as IspPlan | undefined;
    return plan && (plan.downloadMbps > 0 || plan.uploadMbps > 0) ? plan : null;
}

export async function saveIspPlan(plan: IspPlan | null): Promise<void> {
    if (plan && (plan.downloadMbps > 0 || plan.uploadMbps > 0)) await chrome.storage.sync.set({ [KEY]: plan });
    else await chrome.storage.sync.remove(KEY);
}


export { planShare } from '@meterx/shared';
