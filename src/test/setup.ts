import 'fake-indexeddb/auto';

import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './msw/server';

// The whole suite runs in parallel workers: give findBy/waitFor room before they give up.
const ASYNC_UTIL_TIMEOUT_MS = 4000;
configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

// jsdom has no ResizeObserver; Recharts needs one to size its charts. Tests do not measure layout.
class NoopResizeObserver {
  observe(): void {
    return;
  }
  unobserve(): void {
    return;
  }
  disconnect(): void {
    return;
  }
}
globalThis.ResizeObserver ??= NoopResizeObserver;

// A test that reaches the network without a handler fails: tests never call the real API.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
