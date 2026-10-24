import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const ext = resolve(here, '../extension');

if (!existsSync(resolve(ext, 'dist/popup.html'))) throw new Error('Build the extension first: npm run build -w @meterx/extension');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Pages and images; partials are filled in below, not served.
cpSync(resolve(here, 'static'), dist, { recursive: true, filter: src => !src.includes('_partials') });
cpSync(resolve(ext, 'static/fonts'), resolve(dist, 'fonts'), { recursive: true });
cpSync(resolve(ext, 'static/styles/app.css'), resolve(dist, 'styles/app.css'));

// The real extension pages, run in demo mode by the shim, which must load before each page's own script.
const app = resolve(dist, 'app');
cpSync(resolve(ext, 'dist'), app, { recursive: true, filter: src => !/background\.js$|manifest\.json$/.test(src) });
for (const page of ['popup.html', 'sidepanel.html', 'options.html']) {
    const f = resolve(app, page);
    writeFileSync(f, readFileSync(f, 'utf8').replace('<script', '<script src="/js/demo-shim.js"></script>\n    <script'));
}

// Shared header and footer, so every page carries the same ones.
const partial = name => readFileSync(resolve(here, 'static/_partials', `${name}.html`), 'utf8').trim();
const header = partial('header'), footer = partial('footer');
const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? (p === app ? [] : walk(p)) : [p]; });
for (const f of walk(dist).filter(p => p.endsWith('.html'))) {
    writeFileSync(f, readFileSync(f, 'utf8').replace('<!-- header -->', header).replace('<!-- footer -->', footer));
}

const common = { absWorkingDir: here, bundle: true, target: 'es2022', minify: true };
await build({ ...common, entryPoints: { home: 'src/home.ts', share: 'src/share.ts', get: 'src/get.ts', faq: 'src/faq.ts', contribute: 'src/contribute.ts', common: 'src/common.ts' }, format: 'esm', outdir: resolve(dist, 'js') });
await build({ ...common, entryPoints: { 'demo-shim': 'src/demo-shim.ts' }, format: 'iife', outdir: resolve(dist, 'js') });

console.log('Site built to dist/');
