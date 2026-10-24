import { describe, it, expect } from 'vitest';
import { toFirefox } from './package-stores.mjs';

describe('toFirefox', () => {
    it('swaps the side panel for a sidebar, the worker for a background script, and adds the listing id', () => {
        const m = { permissions: ['storage', 'sidePanel'], side_panel: { default_path: 'sidepanel.html' }, background: { service_worker: 'background.js' }, icons: { 16: 'i.png' } };
        const f = toFirefox(m);
        expect(f.permissions).toEqual(['storage']);
        expect(f.side_panel).toBeUndefined();
        expect(f.sidebar_action.default_panel).toBe('sidepanel.html');
        expect(f.background).toEqual({ scripts: ['background.js'], type: 'module' });
        expect(f.browser_specific_settings.gecko.id).toBe('meterx@ajithakdev');
        expect(m.side_panel).toBeDefined(); // the input is not changed
    });
});
