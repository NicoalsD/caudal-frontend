import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sleep } from './RetryHttpClient';

const WAIT_MS = 1_000;
const JUST_BEFORE_MS = 999;
const JUST_AFTER_MS = 1;

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves once the time has passed, not before', async () => {
    let done = false;
    void sleep(WAIT_MS).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(JUST_BEFORE_MS);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(JUST_AFTER_MS);
    expect(done).toBe(true);
  });

  it('rejects with the abort reason when the signal fires first', async () => {
    const controller = new AbortController();
    const waiting = sleep(WAIT_MS, controller.signal);
    const failure = waiting.then(
      () => null,
      (error: unknown) => error,
    );

    controller.abort(new Error('cancelled'));

    expect(await failure).toEqual(new Error('cancelled'));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already'));

    await expect(sleep(WAIT_MS, controller.signal)).rejects.toThrow('already');
  });
});
