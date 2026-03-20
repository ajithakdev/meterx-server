import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bundle TypeScript source files
await build({
    entryPoints: [
        resolve(__dirname, 'src/background.ts'),
        resolve(__dirname, 'src/popup.ts'),
        resolve(__dirname, 'src/options.ts'),
    ],
    bundle: true,
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
