import { describe, expect, it } from 'vitest';

import { levelFraction, relativeFlow } from './flow';

const QUARTER = 0.25;
const EIGHTY_PERCENT = 0.8;
const HALF = 0.5;
const ABOVE_FULL = 4;
const BELOW_EMPTY = -1;
const GAUGE_MAX = 5;
const MID_LEVEL = 2.5;
const OVER_LEVEL = 9;
const FLAT_RANGE = 2;

describe('relativeFlow', () => {
  it('is zero when the valve is closed', () => {
    expect(relativeFlow(EIGHTY_PERCENT, false)).toBe(0);
  });

  it('follows the square root of the level', () => {
    expect(relativeFlow(1, true)).toBe(1);
    expect(relativeFlow(QUARTER, true)).toBeCloseTo(HALF);
    expect(relativeFlow(0, true)).toBe(0);
  });

  it('clamps levels outside 0..1', () => {
    expect(relativeFlow(ABOVE_FULL, true)).toBe(1);
    expect(relativeFlow(BELOW_EMPTY, true)).toBe(0);
  });
});

describe('levelFraction', () => {
  it('maps the level into the gauge range', () => {
    expect(levelFraction(MID_LEVEL, 0, GAUGE_MAX)).toBe(HALF);
    expect(levelFraction(OVER_LEVEL, 0, GAUGE_MAX)).toBe(1);
    expect(levelFraction(1, FLAT_RANGE, FLAT_RANGE)).toBe(0);
  });
});
