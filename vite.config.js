import { defineConfig } from 'vite';
import { resolve, extname } from 'path';
import { existsSync, statSync, createReadStream } from 'fs';

const MIME = {
  '.html': 'text/html',            '.js':   'text/javascript',
  '.mjs':  'text/javascript',      '.css':  'text/css',
  '.json': 'application/json',     '.map':  'application/json',
  '.svg':  'image/svg+xml',        '.png':  'image/png',
  '.jpg':  'image/jpeg',           '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',            '.webp': 'image/webp',
  '.ico':  'image/x-icon',         '.woff': 'font/woff',
  '.woff2': 'font/woff2',          '.ttf':  'font/ttf',
  '.wasm': 'application/wasm',     '.txt':  'text/plain',
};

export default defineConfig({
  plugins: [
    {
      /* Serve the portal from the repo-root `lms/` directory.
         Production serves it from there (vercel.json rewrites /lms ->
         /lms/index.html), but dev used to resolve /lms/ out of `public/lms/`
         because publicDir is `public`. That meant two byte-identical copies of
         62 files, one per environment, and every portal fix had to be applied
         twice or the two would silently drift. This makes dev read the same
         directory production does, so one copy is the single source of truth. */
      name: 'ck-serve-lms-from-root',
      configureServer(server) {
        const lmsRoot = resolve(__dirname, 'lms');
        server.middlewares.use((req, res, next) => {
          const [pathname] = (req.url || '').split('?');
          if (!pathname.startsWith('/lms/')) return next();
          let rel = pathname.slice('/lms'.length);
          if (rel === '/' ) rel = '/index.html';
          const file = resolve(lmsRoot, '.' + rel);
          // Never let a crafted path escape the lms directory.
          if (!file.startsWith(lmsRoot)) return next();
          if (!existsSync(file) || statSync(file).isDirectory()) return next();
          res.setHeader('Content-Type', MIME[extname(file).toLowerCase()] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'no-cache');
          return createReadStream(file).pipe(res);
        });
      },
    },
    {
      // Vite's static layer does not redirect a directory request without its
      // trailing slash, so "/lms" fell through to the SPA history fallback and
      // served the landing page instead of the portal. Vercel handles this in
      // production via a rewrite; this makes dev behave the same way.
      name: 'ck-lms-dir-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const [path, query] = (req.url || '').split('?');
          if (path === '/lms') {
            res.writeHead(301, { Location: '/lms/' + (query ? '?' + query : '') });
            return res.end();
          }
          next();
        });
      },
    },
  ],

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
        target:    'https://vseombfkrvpffnpgbsnk.supabase.co',
        changeOrigin: true,
        rewrite: (p) => p,
      },
      '/api': {
        target: 'https://vseombfkrvpffnpgbsnk.supabase.co/functions/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
