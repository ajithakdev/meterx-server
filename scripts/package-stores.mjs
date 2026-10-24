/**
 * Builds the extension and writes one upload per store into release/:
 *   meterx-<version>-chromium.zip  Chrome Web Store, Edge Add-ons, Opera Add-ons
 *   meterx-<version>-firefox.zip   Firefox Add-ons (sidebar instead of side panel, background script, gecko id)
 *   meterx-<version>-source.zip    the source at HEAD, which Firefox reviewers ask for with bundled code
 * @license AGPL-3.0
 */

import { execFileSync } from 'child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'apps/extension/dist');
const out = resolve(root, 'release');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

/** Chromium manifest to Firefox: same pages, Firefox's own sidebar and background keys, and the listing's id. */
export function toFirefox(m) {
    const f = structuredClone(m);
    f.permissions = f.permissions.filter(p => p !== 'sidePanel');
    delete f.side_panel;
    f.sidebar_action = { default_panel: 'sidepanel.html', default_title: 'MeterX', default_icon: m.icons, open_at_install: false };
    f.background = { scripts: [m.background.service_worker], type: 'module' };
    f.browser_specific_settings = {
        gecko: { id: 'meterx@ajithakdev', strict_min_version: '121.0', data_collection_permissions: { required: ['none'] } },
    };
    return f;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    run('npm', ['run', 'build', '-w', '@meterx/extension']);
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });

    run('zip', ['-qr', resolve(out, `meterx-${version}-chromium.zip`), '.'], dist);

    const ff = resolve(out, 'firefox');
    cpSync(dist, ff, { recursive: true });
    const manifest = JSON.parse(readFileSync(resolve(ff, 'manifest.json'), 'utf8'));
    writeFileSync(resolve(ff, 'manifest.json'), JSON.stringify(toFirefox(manifest), null, 2) + '\n');
    run('zip', ['-qr', resolve(out, `meterx-${version}-firefox.zip`), '.'], ff);
    rmSync(ff, { recursive: true, force: true });

    run('git', ['archive', '--format=zip', '-o', resolve(out, `meterx-${version}-source.zip`), 'HEAD']);
    console.log(`Store packages for ${version} are in release/`);
}
