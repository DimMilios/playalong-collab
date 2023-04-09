import { defineConfig } from 'vite';

export default defineConfig({
  base: '/apprepository/',
  build: { sourcemap: true }
  server: { port: 5001 },
});
