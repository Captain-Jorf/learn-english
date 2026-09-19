import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset URLs keep the experience fully offline inside Android WebView.
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    // Arena's proxied preview host is dynamic, so allow it explicitly via Vite's boolean mode.
    allowedHosts: true,
    proxy: {
      // Browser-facing code uses a relative URL; Vite forwards it to the real local reference API.
      '/api': {
        target: process.env.LEXORA_API_ORIGIN || 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
    watch: {
      ignored: ['**/.local/**', '**/artifacts/**'],
    },
  },
});
