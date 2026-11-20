import { describe, expect, it } from 'vitest';

import { minutesUntil, pickShifts } from './pickShifts';

const MINUTE = 60_000;
const NOW = 1_000_000_000;
const THREE = 3;
const MINUTES_AHEAD = 120;
const MINUTES_AFTER = 180;
const SOON = 60;
const SOON_END = 90;
const STARTED = -30;
const ENDS = 30;
const LATER_START = 10;
const LATER_END = 20;
const PAST_START = -20;
const PAST_END = -10;
const shift = (id: string, from: number, to: number) => ({
  sectorId: id,
  startMs: NOW + from * MINUTE,
  endMs: NOW + to * MINUTE,
});

describe('pickShifts', () => {
  it('finds the running shift and the next one', () => {
    const shifts = [
      shift('c', MINUTES_AHEAD, MINUTES_AFTER),
      shift('a', STARTED, ENDS),
      shift('b', SOON, SOON_END),
    ];

    const result = pickShifts(shifts, NOW);

    expect(result.current?.sectorId).toBe('a');
    expect(result.next?.sectorId).toBe('b');
  });

  it('has no running shift between two shifts, and no next at the end of the day', () => {
    expect(pickShifts([shift('a', LATER_START, LATER_END)], NOW)).toMatchObject({ current: null });
    expect(pickShifts([shift('a', PAST_START, PAST_END)], NOW)).toEqual({
      current: null,
      next: null,
    });
  });
});

describe('minutesUntil', () => {
  it('rounds up and never goes below zero', () => {
    expect(minutesUntil(NOW + THREE * MINUTE - 1, NOW)).toBe(THREE);
    expect(minutesUntil(NOW - MINUTE, NOW)).toBe(0);
  });
});
