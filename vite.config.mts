import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: {
    alias: { '@': resolve(rootDir) },
  },
  build: {
    outDir: 'js/dock-runtime',
    emptyOutDir: true,
    lib: {
      entry: resolve(rootDir, 'components/dock-entry.tsx'),
      formats: ['es'],
      fileName: () => 'dock.js',
    },
    rollupOptions: {
      output: { assetFileNames: 'dock.[ext]' },
    },
  },
});
