import { describe, expect, it } from 'vitest';

import { plain } from '../../../test/text';

import { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

const adapter = new ApiDtoAdapter();

const LEVEL = 2.1;
const PRECISE_LEVEL = 2.345;
const TWO_DECIMALS = 2;
const NOTE_MAX = 500;
const NOTE_LINES = 10;

describe('ApiDtoAdapter.toHealth', () => {
  it('maps UP and DOWN to a boolean', () => {
    expect(adapter.toHealth({ status: 'UP' })).toEqual({ isUp: true });
    expect(adapter.toHealth({ status: 'DOWN' })).toEqual({ isUp: false });
  });
});

describe('ApiDtoAdapter.toConstraints', () => {
  it('converts snake_case limits to camelCase', () => {
    const map = adapter.toConstraints({
      'reading.note': { min: 0, max: NOTE_MAX, max_lines: NOTE_LINES },
    });

    expect(map).toEqual({ 'reading.note': { min: 0, max: NOTE_MAX, maxLines: NOTE_LINES } });
  });

  it('copies only the limits that arrived, so absent ones stay absent', () => {
    const map = adapter.toConstraints({
      'sector.code': { pattern: '^[A-Z0-9-]+$' },
      empty: {},
    });

    expect(map['sector.code']).toEqual({ pattern: '^[A-Z0-9-]+$' });
    expect(map.empty).toEqual({});
    expect(Object.keys(map['sector.code'] ?? {})).toEqual(['pattern']);
  });

  it('does not copy unknown fields of a limit', () => {
    const dto = { f: { max: 1, surprise: 'x' } } as unknown as Parameters<
      ApiDtoAdapter['toConstraints']
    >[0];

    expect(adapter.toConstraints(dto).f).toEqual({ max: 1 });
  });

  it('returns an empty map for an empty response', () => {
    expect(adapter.toConstraints({})).toEqual({});
  });
});

describe('ApiDtoAdapter.toTimestamp', () => {
  it('gives the Date, the Bogota text and the service day', () => {
    const view = adapter.toTimestamp('observed_at', '2026-10-10T03:30:00Z');

    expect(view.date.toISOString()).toBe('2026-10-10T03:30:00.000Z');
    expect(plain(view.text)).toBe('9 de oct de 2026, 10:30 p. m.');
    expect(view.dayKey).toBe('2026-10-09');
  });

  it('names the field when the instant is invalid', () => {
    expect(() => adapter.toTimestamp('observed_at', 'no-es-fecha')).toThrow(InvalidDtoError);
    expect(() => adapter.toTimestamp('observed_at', 'no-es-fecha')).toThrow('"observed_at"');
  });
});

describe('ApiDtoAdapter.toDecimal', () => {
  it('keeps the number and writes the text with comma', () => {
    expect(adapter.toDecimal('gauge_value', LEVEL)).toEqual({ value: LEVEL, text: '2,1' });
  });

  it('rounds the text, not the value, to the requested digits', () => {
    expect(adapter.toDecimal('gauge_value', PRECISE_LEVEL, TWO_DECIMALS)).toEqual({
      value: PRECISE_LEVEL,
      text: '2,35',
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (value) => {
    expect(() => adapter.toDecimal('gauge_value', value)).toThrow(InvalidDtoError);
  });
});
