import { describe, expect, it } from 'vitest';

import { ExponentialBackoff } from './Backoff';

const INITIAL_MS = 2_000;
const MAX_MS = 16_000;
const JITTER = 0.2;
const MIDDLE_RANDOM = 0.5;
const LOWEST_RANDOM = 0;
const GROWTH = 2;
const SECOND_ATTEMPT = 2;
const SIX_ATTEMPTS = 6;
const FIRST_ATTEMPT = 1;

describe('ExponentialBackoff', () => {
  it('doubles the delay without jitter until the ceiling', () => {
    const backoff = new ExponentialBackoff(INITIAL_MS, MAX_MS, 0, () => MIDDLE_RANDOM);
    const attempts = Array.from({ length: SIX_ATTEMPTS }, (_, index) => index + FIRST_ATTEMPT);

    expect(attempts.map((attempt) => backoff.delayFor(attempt))).toEqual([
      INITIAL_MS,
      INITIAL_MS * GROWTH,
      INITIAL_MS * GROWTH * GROWTH,
      MAX_MS,
      MAX_MS,
      MAX_MS,
    ]);
  });

  it('spreads the delay by the jitter ratio, in both directions', () => {
    const low = new ExponentialBackoff(INITIAL_MS, MAX_MS, JITTER, () => LOWEST_RANDOM);
    const middle = new ExponentialBackoff(INITIAL_MS, MAX_MS, JITTER, () => MIDDLE_RANDOM);

    expect(low.delayFor(SECOND_ATTEMPT)).toBe(INITIAL_MS * GROWTH * (1 - JITTER));
    expect(middle.delayFor(SECOND_ATTEMPT)).toBe(INITIAL_MS * GROWTH);
  });
});
