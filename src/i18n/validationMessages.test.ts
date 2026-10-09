import { describe, expect, it } from 'vitest';

import { keyMessages, type ValidationMessageKey } from '../core/forms/validationMessages';
import { strings } from './es';
import { validationMessages } from './validationMessages';

const KEYS: readonly ValidationMessageKey[] = [
  'required',
  'min',
  'max',
  'maxLines',
  'pattern',
  'rangeMin',
  'rangeMax',
  'decimalPlaces',
  'number',
];

const MAX_HOURS = 24;
const REDUCED_MAX_HOURS = 23;
const RANGE_MAX = 5;
const ONE_DECIMAL_LIMIT = 2.5;

describe('validationMessages', () => {
  it('has a Spanish text for every key the builder can ask for', () => {
    for (const key of KEYS) {
      expect(strings.validation[key], key).toBeTruthy();
      expect(validationMessages(key, { min: 1, max: 1 }), key).not.toContain('{');
    }
  });

  it('interpolates the limit that failed', () => {
    expect(validationMessages('max', { max: MAX_HOURS })).toBe('Máximo 24');
    expect(validationMessages('rangeMax', { max: RANGE_MAX })).toBe(
      'El número no puede ser mayor que 5',
    );
  });

  it('shows the new limit when the rule changes, without touching the caller', () => {
    expect(validationMessages('max', { max: REDUCED_MAX_HOURS })).toBe('Máximo 23');
  });

  it('writes decimal limits with comma', () => {
    expect(validationMessages('rangeMax', { max: ONE_DECIMAL_LIMIT })).toBe(
      'El número no puede ser mayor que 2,5',
    );
  });

  it('keyMessages only returns the key, never text', () => {
    expect(keyMessages('max', { max: MAX_HOURS })).toBe('validation.max');
  });
});
