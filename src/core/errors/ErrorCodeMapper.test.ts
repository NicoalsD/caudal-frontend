import { describe, expect, it } from 'vitest';

import { codeToKey, ErrorCodeMapper, snakeToCamel } from './ErrorCodeMapper';

describe('codeToKey', () => {
  it.each([
    ['GAUGE_OUT_OF_RANGE', 'gaugeOutOfRange'],
    ['UNAUTHORIZED', 'unauthorized'],
    ['IA_UNAVAILABLE', 'iaUnavailable'],
  ])('maps %s to %s', (code, key) => {
    expect(codeToKey(code)).toBe(key);
  });
});

describe('snakeToCamel', () => {
  it('maps detail names to placeholder names', () => {
    expect(snakeToCamel('gauge_min')).toBe('gaugeMin');
    expect(snakeToCamel('value')).toBe('value');
  });
});

describe('ErrorCodeMapper', () => {
  const mapper = new ErrorCodeMapper(new Set(['gaugeOutOfRange', 'forbidden']));

  it('returns the key of a known code', () => {
    expect(mapper.keyFor('GAUGE_OUT_OF_RANGE')).toBe('gaugeOutOfRange');
    expect(mapper.keyFor('FORBIDDEN')).toBe('forbidden');
  });

  it('returns null for an unknown code so the caller can use the generic text', () => {
    expect(mapper.keyFor('SOMETHING_NEW')).toBeNull();
  });
});
