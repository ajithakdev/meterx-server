import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: 'popup.html',
        background: 'background.ts'
      }
    },
    assetsDir: '',
    base: './'
  },
});
