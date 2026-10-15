import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  // The app version comes from package.json, so the health screen never hardcodes it.
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    // Never inline fonts as data: URIs; the CSP only allows font-src 'self'.
    assetsInlineLimit: 0,
  },
});
