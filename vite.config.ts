import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // Never inline fonts as data: URIs; the CSP only allows font-src 'self'.
    assetsInlineLimit: 0,
  },
});
