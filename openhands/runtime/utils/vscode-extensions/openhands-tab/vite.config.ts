/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/webview/index.tsx'),
      name: 'OpenHandsWebview',
      fileName: 'webview',
      formats: ['iife']
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    minify: false // Keep readable for debugging
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});
