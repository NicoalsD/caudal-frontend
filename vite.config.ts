import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import packageJson from './package.json';

// Colors come from the tokens in src/ui/styles/tokens.css (--color-page, --color-water-700).
const PAGE_COLOR = '#f4f0e6';
const WATER_COLOR = '#1d5a6e';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // The app registers the worker itself (src/app/pwa/UpdatePrompt.tsx), so no inline script
      // is injected into index.html and the CSP keeps script-src 'self' without exceptions.
      injectRegister: false,
      registerType: 'prompt',
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      devOptions: { enabled: false },
      manifest: {
        name: 'CAUDAL',
        short_name: 'CAUDAL',
        description: 'El cuaderno del acueducto, pero digital.',
        lang: 'es-CO',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: WATER_COLOR,
        background_color: PAGE_COLOR,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell only: the HTML, JS, CSS, fonts and icons. Operator screens open offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Explicit and empty: /api/v1 is never cached by the worker. Data lives in IndexedDB
        // (offline-sync.md, section 11; security.md, section 11).
        runtimeCaching: [],
      },
    }),
  ],
  // The app version comes from package.json, so the health screen never hardcodes it.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    // Never inline fonts as data: URIs; the CSP only allows font-src 'self'.
    assetsInlineLimit: 0,
  },
});
