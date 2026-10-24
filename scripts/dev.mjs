/**
 * Local test runs, one command each:
 *   node scripts/dev.mjs site  builds the extension and the site, serves the site on http://localhost:8788
 *   node scripts/dev.mjs ext   builds the extension, runs the worker on http://localhost:8787,
 *                              and opens Chromium with the extension loaded in a separate test profile
 * Ctrl+C stops everything it started.
 * @license AGPL-3.0
 */

import { execFileSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrangler = resolve(root, 'node_modules/.bin/wrangler');
const mode = process.argv[2];
const children = [];

const build = (...workspaces) => {
    for (const w of workspaces) execFileSync('npm', ['run', 'build', '-w', w], { cwd: root, stdio: 'inherit' });
};
const start = (cmd, args, opts = {}) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
    children.push(child);
    child.on('exit', code => { if (code && mode !== 'ext') process.exit(code); });
    return child;
};
const stop = () => { children.forEach(c => c.kill('SIGTERM')); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

/** Chromium first (it still honours --load-extension), then Chrome. CHROME=<path> overrides. */
function findBrowser() {
    if (process.env.CHROME) return process.env.CHROME;
    for (const name of ['chromium-browser', 'chromium', 'google-chrome', 'google-chrome-stable']) {
        try { return execFileSync('which', [name], { encoding: 'utf8' }).trim(); } catch { /* try the next one */ }
    }
    return null;
}

if (mode === 'site') {
    build('@meterx/extension', '@meterx/site');
    console.log('\nSite: http://localhost:8788  (Ctrl+C to stop)\n');
    start(wrangler, ['pages', 'dev', 'apps/site/dist', '--port', '8788']);
} else if (mode === 'ext') {
    build('@meterx/extension');
    const dist = resolve(root, 'apps/extension/dist');
    const profile = resolve(root, '.dev/chromium-profile');
    mkdirSync(profile, { recursive: true });
    start(wrangler, ['dev', '--port', '8787'], { cwd: resolve(root, 'services/worker') });
    const browser = findBrowser();
    if (!browser || !existsSync(browser)) {
        console.log(`\nNo Chromium found. Load ${dist} by hand at chrome://extensions (Developer mode, Load unpacked).\n`);
    } else {
        start(browser, [
            `--user-data-dir=${profile}`,
            `--load-extension=${dist}`,
            '--disable-features=DisableLoadExtensionCommandLineSwitch',
            '--no-first-run',
            '--no-default-browser-check',
            'chrome://extensions',
        ]);
        console.log(`\nChromium opened with MeterX loaded from ${dist}`);
    }
    console.log('Local worker: http://localhost:8787. In MeterX settings choose Custom server and enter it to test the new worker.');
    console.log('After a code change: npm run build -w @meterx/extension, then reload MeterX on chrome://extensions.  Ctrl+C stops everything.\n');
} else {
    console.log('Usage: node scripts/dev.mjs site | ext');
    process.exit(1);
}
