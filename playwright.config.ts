import { defineConfig, devices } from '@playwright/test';

import { API_BASE_URL, APP_ORIGIN, APP_PORT } from './e2e/support/constants';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
const SERVER_START_TIMEOUT_MS = 180_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;
const IS_CI = process.env.CI !== undefined;

/**
 * End-to-end tests run against the production build (`vite preview`), because the service worker
 * and the offline queue only exist there. The API is mocked with page.route (e2e/support/api.ts).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: APP_ORIGIN,
    // A service worker that controls the page takes its requests out of page.route, so the API
    // mocks stop answering. The PWA itself is checked by the build and by hand (Version-1.0.0.md).
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: MOBILE_VIEWPORT,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
  ],
  webServer: {
    // The vite binary runs directly (no pnpm in between), so stopping the server stops vite too.
    command: `pnpm build && ./node_modules/.bin/vite preview --port ${APP_PORT} --strictPort`,
    url: APP_ORIGIN,
    // Always a fresh build: a reused preview server could serve an older dist.
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    env: { VITE_API_BASE_URL: API_BASE_URL },
    // pnpm starts vite in a child process: stop the whole group, or the run waits for it forever.
    gracefulShutdown: { signal: 'SIGTERM', timeout: SHUTDOWN_TIMEOUT_MS },
  },
});
