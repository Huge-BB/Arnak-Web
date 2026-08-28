import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ build: { rollupOptions: { input: { game: resolve(import.meta.dirname, 'index.html'), calibrate: resolve(import.meta.dirname, 'calibrate.html'), atlas: resolve(import.meta.dirname, 'atlas.html') } } } });
