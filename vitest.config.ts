import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    resolve: {
      // Under Node, react-router and react-router/dom resolve to different builds, which splits
      // the router contexts in two. Tests use the root entry point for both.
      alias: [{ find: /^react-router\/dom$/, replacement: 'react-router' }],
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      env: { VITE_API_BASE_URL: 'http://api.caudal.test/api/v1' },
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/i18n/**',
          'src/test/**',
          'src/**/*.d.ts',
          'src/**/*.test.{ts,tsx}',
          'src/main.tsx',
        ],
        thresholds: {
          lines: 80,
          branches: 80,
          'src/core/**': { lines: 90, branches: 90 },
        },
      },
    },
  }),
);
