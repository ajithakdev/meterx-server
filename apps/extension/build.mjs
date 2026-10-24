import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start clean so files deleted from static/ don't linger in dist/
rmSync(resolve(__dirname, 'dist'), { recursive: true, force: true });

// Bundle TypeScript source files
await build({
    entryPoints: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/pages/popup.ts'),
        options: resolve(__dirname, 'src/pages/options.ts'),
        sidepanel: resolve(__dirname, 'src/pages/sidepanel.ts'),
    },
    bundle: true,
    // jsPDF's optional extras (doc.html, SVG, sanitising); the report draws natively and never loads them.
    external: ['html2canvas', 'dompurify', 'canvg'],
    outdir: resolve(__dirname, 'dist'),
    target: 'chrome110',
    format: 'esm',
    minify: false,
    sourcemap: false,
});

// Copy static assets to dist
mkdirSync(resolve(__dirname, 'dist/images'), { recursive: true });
cpSync(resolve(__dirname, 'static'), resolve(__dirname, 'dist'), { recursive: true });

// The root package.json is the only place the version lives; stamp it into the manifest.
const { version } = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
if (!/^\d+(\.\d+){0,3}$/.test(version)) throw new Error(`Version ${version} is not valid for a browser manifest (use 1 to 4 numbers)`);
const manifestPath = resolve(__dirname, 'dist/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
writeFileSync(manifestPath, JSON.stringify({ ...manifest, version }, null, 2) + '\n');

console.log(`Extension ${version} built to dist/`);
