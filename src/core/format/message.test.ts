import { describe, expect, expectTypeOf, it } from 'vitest';

import { createTranslator, interpolate } from './message';

const catalog = {
  title: 'Registrar lectura',
  validation: {
    max: 'Máximo {max}',
    range: 'Entre {min} y {max}',
  },
  nested: { deeper: { text: 'Hola {name}' } },
} as const;

const MAX_HOURS = 24;
const LOWER_BOUND = 0.5;
const UPPER_BOUND = 5;

describe('interpolate', () => {
  it('replaces every placeholder', () => {
    expect(interpolate('Entre {min} y {max}', { min: '1', max: '5' })).toBe('Entre 1 y 5');
  });

  it('formats numbers with decimal comma', () => {
    expect(interpolate('Entre {min} y {max}', { min: LOWER_BOUND, max: UPPER_BOUND })).toBe(
      'Entre 0,5 y 5',
    );
  });

  it('keeps the placeholder visible when the value is missing', () => {
    expect(interpolate('Máximo {max}', {})).toBe('Máximo {max}');
    expect(interpolate('Máximo {max}')).toBe('Máximo {max}');
  });

  it('leaves text without placeholders untouched', () => {
    expect(interpolate('Sin variables')).toBe('Sin variables');
  });

  it('does not interpret HTML in values', () => {
    expect(interpolate('Hola {name}', { name: '<b>x</b>' })).toBe('Hola <b>x</b>');
  });
});

describe('createTranslator', () => {
  const t = createTranslator(catalog);

  it('reads top level and nested keys', () => {
    expect(t('title')).toBe('Registrar lectura');
    expect(t('nested.deeper.text', { name: 'Ana' })).toBe('Hola Ana');
  });

  it('interpolates the values it is given', () => {
    expect(t('validation.max', { max: MAX_HOURS })).toBe('Máximo 24');
  });

  it('changes the text when the value changes, without touching the caller', () => {
    const show = (max: number): string => t('validation.max', { max });
    expect(show(MAX_HOURS)).toBe('Máximo 24');
    expect(show(MAX_HOURS - 1)).toBe('Máximo 23');
  });

  it('throws for a key that does not exist', () => {
    const loose = t as unknown as (key: string) => string;
    expect(() => loose('nope.missing')).toThrow('Missing text for key "nope.missing"');
    expect(() => loose('validation')).toThrow('Missing text for key "validation"');
  });

  it('checks keys and placeholders at compile time', () => {
    expectTypeOf(t)
      .parameter(0)
      .toEqualTypeOf<'title' | 'validation.max' | 'validation.range' | 'nested.deeper.text'>();
    // @ts-expect-error unknown key
    expect(() => t('does.not.exist')).toThrow();
    // @ts-expect-error placeholder values are required
    expect(t('validation.max')).toBe('Máximo {max}');
  });
});
