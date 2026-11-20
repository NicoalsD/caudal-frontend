import { defineConfig, devices } from '@playwright/test';

import { API_BASE_URL, APP_ORIGIN, APP_PORT } from './e2e/support/constants';

const PHONE_VIEWPORT = { width: 390, height: 844 };
/** 390 CSS px at 2x: the capture is 780 px wide, the width the landing frames use. */
const PHONE_SCALE = 2;
const SERVER_START_TIMEOUT_MS = 180_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;

/**
 * Screen captures for the landing (`pnpm capture:screens`). Same production build and fake API as
 * playwright.config.ts, but the specs are *.capture.ts and every screen is taken twice: light and
 * dark. The config is kept apart so `pnpm e2e` never runs the captures.
 */
export default defineConfig({
  testDir: './e2e/capture',
  testMatch: '**/*.capture.ts',
  fullyParallel: false,
  workers: 1,
  // The first sign in after a cold preview can time out; a retry keeps the run whole.
  retries: 2,
  reporter: [['list']],
  use: {
    baseURL: APP_ORIGIN,
    // Same as the e2e config: a service worker would take the requests out of page.route.
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    {
      name: 'light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: PHONE_VIEWPORT,
        deviceScaleFactor: PHONE_SCALE,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'light',
      },
    },
    {
      name: 'dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: PHONE_VIEWPORT,
        deviceScaleFactor: PHONE_SCALE,
        isMobile: true,
        hasTouch: true,
        colorScheme: 'dark',
      },
    },
  ],
  webServer: {
    // Same build as the e2e run; the API origin is the fake one that the CSP allows.
    command: `pnpm build && ./node_modules/.bin/vite preview --port ${APP_PORT} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    env: { VITE_API_BASE_URL: API_BASE_URL },
    gracefulShutdown: { signal: 'SIGTERM', timeout: SHUTDOWN_TIMEOUT_MS },
  },
});
