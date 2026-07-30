import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Keep in sync with WEB_ORIGIN in .env.example and the API's CORS allowlist. */
const WEB_PORT = 5173;

export default defineConfig({
  plugins: [react()],
  // The monorepo keeps a single .env at the repository root, so Vite is
  // pointed there instead of apps/web. Only VITE_-prefixed variables are
  // exposed to the browser bundle — server secrets in the same file are not.
  envDir: '../..',
  server: {
    port: WEB_PORT,
    strictPort: true,
  },
  preview: {
    port: WEB_PORT,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
