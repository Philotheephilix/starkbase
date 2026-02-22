import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Resolve SDK directly from source in dev — no rebuild needed
      '@starkbase/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@starkbase/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api calls to backend to avoid CORS in dev
      '/api': {
        target: 'http://localhost:8080',
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
