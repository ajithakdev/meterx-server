import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const ext = resolve(here, '../extension/static');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Pages, styles and images, then the extension's own font and stylesheet so interface fragments look exactly like the app.
cpSync(resolve(here, 'static'), dist, { recursive: true });
cpSync(resolve(ext, 'fonts'), resolve(dist, 'fonts'), { recursive: true });
cpSync(resolve(ext, 'styles/app.css'), resolve(dist, 'styles/app.css'));

await build({
    entryPoints: { home: 'src/home.ts', share: 'src/share.ts', get: 'src/get.ts', common: 'src/common.ts' },
    absWorkingDir: here,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    outdir: resolve(dist, 'js'),
});

console.log('Site built to dist/');
