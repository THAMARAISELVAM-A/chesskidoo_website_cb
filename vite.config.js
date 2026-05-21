import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Multi-page: one entry per HTML shell
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
      },
      output: {
        // Content-hash every chunk so CDN caches never go stale
        chunkFileNames:  'assets/js/[name]-[hash].js',
        entryFileNames:  'assets/js/[name]-[hash].js',
        assetFileNames:  'assets/[ext]/[name]-[hash].[ext]',
        // Keep Stockfish WASM out of the main bundle
        manualChunks(id) {
          if (id.includes('stockfish'))     return 'stockfish';
          if (id.includes('@supabase'))     return 'supabase';
          if (id.includes('node_modules'))  return 'vendor';
        },
      },
    },
    // Fail loudly on anything over 500 kB uncompressed
    chunkSizeWarningLimit: 500,
    sourcemap: true,
  },

  // Resolve aliases so modules import cleanly
  resolve: {
    alias: {
      '@lib':        resolve(__dirname, 'src/lib'),
      '@pages':      resolve(__dirname, 'src/pages'),
      '@components': resolve(__dirname, 'src/components'),
      '@styles':     resolve(__dirname, 'src/styles'),
    },
  },

  // Serve public/ as root (images, favicon, etc.)
  publicDir: 'public',

  // During dev, proxy Supabase Edge Functions at /functions/v1/*
  server: {
    port: 5173,
    proxy: {
      '/functions/v1': {
        target:    'https://hcjuyqicftkgpiyrkscr.supabase.co',
        changeOrigin: true,
        rewrite: (p) => p,
      },
    },
  },
});
