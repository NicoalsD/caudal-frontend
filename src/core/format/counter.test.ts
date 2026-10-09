import { describe, expect, it } from 'vitest';

import { isNearLimit } from './counter';

const MAX = 500;
const NINETY_PERCENT = 450;

describe('isNearLimit', () => {
  it('warns from 90 % of the maximum', () => {
    expect(isNearLimit(NINETY_PERCENT - 1, MAX)).toBe(false);
    expect(isNearLimit(NINETY_PERCENT, MAX)).toBe(true);
    expect(isNearLimit(MAX + 1, MAX)).toBe(true);
  });

  it('never warns without a positive maximum', () => {
    expect(isNearLimit(0, 0)).toBe(false);
    expect(isNearLimit(1, 0)).toBe(false);
  });
});
