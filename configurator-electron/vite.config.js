import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './', // Use relative paths for Electron
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173
  }
});
