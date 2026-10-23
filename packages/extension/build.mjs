import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';
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

console.log('Extension built to dist/');
