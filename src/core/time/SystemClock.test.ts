import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemClock } from './SystemClock';

const FIXED_INSTANT_MS = 1_760_000_000_000;

describe('SystemClock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the current time in milliseconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_INSTANT_MS);

    expect(new SystemClock().nowMs()).toBe(FIXED_INSTANT_MS);
  });
});
