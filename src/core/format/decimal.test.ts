import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { formatDecimal, parseDecimalInput } from './decimal';

const SAMPLE_LEVEL = 2.1;
const WHOLE_NUMBER = 3;
const NEGATIVE_HALF = -0.5;
const TWO_DIGITS = 2;
const LARGE_VALUE = 1234.5;
const THREE_DECIMALS = 2.345;
const MAX_CENTS = 99_999;
const CENTS_PER_UNIT = 100;

describe('formatDecimal', () => {
  it('uses the decimal comma', () => {
    expect(formatDecimal(SAMPLE_LEVEL)).toBe('2,1');
  });

  it('limits the fraction digits to the requested maximum', () => {
    expect(formatDecimal(THREE_DECIMALS, TWO_DIGITS)).toBe('2,35');
    expect(formatDecimal(THREE_DECIMALS, 0)).toBe('2');
  });

  it('groups thousands with a dot', () => {
    expect(formatDecimal(LARGE_VALUE).replace('.', '')).toBe('1234,5');
  });
});

describe('parseDecimalInput', () => {
  it('accepts comma and dot as the decimal separator', () => {
    expect(parseDecimalInput('2,1')).toBe(SAMPLE_LEVEL);
    expect(parseDecimalInput('2.1')).toBe(SAMPLE_LEVEL);
  });

  it('trims surrounding spaces and accepts negative numbers', () => {
    expect(parseDecimalInput('  3  ')).toBe(WHOLE_NUMBER);
    expect(parseDecimalInput('-0,5')).toBe(NEGATIVE_HALF);
  });

  it.each(['', ' ', 'abc', '2,', ',5', '2,1,3', '1e3', '2..1', '0x10', 'NaN'])(
    'rejects %j',
    (raw) => {
      expect(parseDecimalInput(raw)).toBeNull();
    },
  );

  it('round-trips any value with up to two decimals through format and parse', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_CENTS }), (cents) => {
        const value = cents / CENTS_PER_UNIT;
        const text = formatDecimal(value).replaceAll('.', '');
        expect(parseDecimalInput(text)).toBe(value);
      }),
    );
  });
});
