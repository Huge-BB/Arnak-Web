import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const base = process.env.VITE_BASE_PATH || '/';
export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        lab: resolve(import.meta.dirname, 'lab.html'),
        calibrate: resolve(import.meta.dirname, 'calibrate.html'),
        atlas: resolve(import.meta.dirname, 'atlas.html'),
      },
    },
  },
});
