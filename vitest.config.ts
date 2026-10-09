import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
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
