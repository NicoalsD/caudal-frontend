import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ConstraintsMap } from './FieldConstraint';
import {
  FormSchemaBuilder,
  InvalidConstraintError,
  MissingConstraintError,
  type DecimalRule,
} from './FormSchemaBuilder';
import { keyMessages, type ValidationMessageFactory } from './validationMessages';

const NOTE_MAX = 500;
const NOTE_LINES = 3;
const REASON_MIN = 10;
const REASON_MAX = 500;
const GAUGE: DecimalRule = { min: 0, max: 5, decimals: 2 };
const LEVEL = 2.1;
const OUT_OF_RANGE = '8';
const THREE_DECIMALS = '2,123';
const OVER_BY_ONE = 1;

const constraints: ConstraintsMap = {
  'reading.note': { min: 0, max: NOTE_MAX, maxLines: NOTE_LINES },
  change_reason: { min: REASON_MIN, max: REASON_MAX },
  'sector.code': { min: 2, max: 20, pattern: '^[A-Z0-9-]+$' },
  optionalReason: {},
};

function messagesOf(result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string[] {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? []);
}

describe('decimal fields', () => {
  const schema = new FormSchemaBuilder(constraints, keyMessages)
    .decimal('gauge_value', GAUGE)
    .build();

  it('turns "2,1" and "2.1" into the same number', () => {
    expect(schema.parse({ gauge_value: '2,1' })).toEqual({ gauge_value: LEVEL });
    expect(schema.parse({ gauge_value: '2.1' })).toEqual({ gauge_value: LEVEL });
  });

  it('accepts the exact limits of the rule', () => {
    expect(schema.parse({ gauge_value: '0' })).toEqual({ gauge_value: 0 });
    expect(schema.parse({ gauge_value: '5,00' })).toEqual({ gauge_value: GAUGE.max });
  });

  it('rejects a value above the maximum with rangeMax', () => {
    expect(messagesOf(schema.safeParse({ gauge_value: OUT_OF_RANGE }))).toEqual([
      'validation.rangeMax',
    ]);
  });

  it('rejects a value below the minimum with rangeMin', () => {
    expect(messagesOf(schema.safeParse({ gauge_value: '-0,5' }))).toEqual(['validation.rangeMin']);
  });

  it('rejects more decimals than allowed with decimalPlaces', () => {
    expect(messagesOf(schema.safeParse({ gauge_value: THREE_DECIMALS }))).toEqual([
      'validation.decimalPlaces',
    ]);
  });

  it('counts typed decimals, so "2,10" is fine with two decimals', () => {
    expect(schema.parse({ gauge_value: '2,10' })).toEqual({ gauge_value: LEVEL });
  });

  it.each(['', '   ', 'abc', '2,', '1e3'])('rejects %j with number', (raw) => {
    expect(messagesOf(schema.safeParse({ gauge_value: raw }))).toEqual(['validation.number']);
  });

  it('reports the limit that failed as a parameter', () => {
    const seen: [string, Record<string, number>][] = [];
    const recording: ValidationMessageFactory = (key, params) => {
      seen.push([key, { ...params }]);
      return key;
    };
    const recorded = new FormSchemaBuilder(constraints, recording).decimal('g', GAUGE).build();

    recorded.safeParse({ g: OUT_OF_RANGE });
    recorded.safeParse({ g: THREE_DECIMALS });

    expect(seen).toEqual([
      ['rangeMax', { max: GAUGE.max }],
      ['decimalPlaces', { max: GAUGE.decimals }],
    ]);
  });

  it('changes with the rule set without touching the caller', () => {
    const build = (max: number) =>
      new FormSchemaBuilder(constraints, keyMessages).decimal('g', { ...GAUGE, max }).build();

    expect(build(GAUGE.max).safeParse({ g: '5,5' }).success).toBe(false);
    expect(build(GAUGE.max + OVER_BY_ONE).safeParse({ g: '5,5' }).success).toBe(true);
  });

  it('accepts any value with up to the allowed decimals inside the range (property)', () => {
    const CENTS_MAX = 500;
    const CENTS_PER_UNIT = 100;
    fc.assert(
      fc.property(fc.integer({ min: 0, max: CENTS_MAX }), fc.boolean(), (cents, useComma) => {
        const value = cents / CENTS_PER_UNIT;
        const typed = useComma ? String(value).replace('.', ',') : String(value);
        expect(schema.parse({ gauge_value: typed })).toEqual({ gauge_value: value });
      }),
    );
  });
});

describe('text fields', () => {
  const schema = new FormSchemaBuilder(constraints, keyMessages)
    .text('reading.note')
    .text('sector.code')
    .build();
  const valid = { 'reading.note': 'sin novedad', 'sector.code': 'ALTO-1' };

  it('trims the text', () => {
    expect(schema.parse({ ...valid, 'reading.note': '  sin novedad  ' })).toEqual(valid);
  });

  it('allows an empty value when the minimum is zero', () => {
    expect(schema.parse({ ...valid, 'reading.note': '   ' })['reading.note']).toBe('');
  });

  it('rejects text longer than the server maximum, counting after trim', () => {
    const exact = 'x'.repeat(NOTE_MAX);
    expect(schema.safeParse({ ...valid, 'reading.note': exact }).success).toBe(true);
    expect(messagesOf(schema.safeParse({ ...valid, 'reading.note': `${exact}x` }))).toEqual([
      'validation.max',
    ]);
  });

  it('limits the number of lines with maxLines', () => {
    const threeLines = ['a', 'b', 'c'].join('\n');
    const fourLines = ['a', 'b', 'c', 'd'].join('\r\n');
    expect(schema.safeParse({ ...valid, 'reading.note': threeLines }).success).toBe(true);
    expect(messagesOf(schema.safeParse({ ...valid, 'reading.note': fourLines }))).toEqual([
      'validation.maxLines',
    ]);
  });

  it('applies the pattern sent by the server', () => {
    expect(messagesOf(schema.safeParse({ ...valid, 'sector.code': 'alto 1' }))).toEqual([
      'validation.pattern',
    ]);
  });

  it('requires text when the minimum is above zero', () => {
    expect(messagesOf(schema.safeParse({ ...valid, 'sector.code': '' }))).toEqual([
      'validation.required',
    ]);
    expect(messagesOf(schema.safeParse({ ...valid, 'sector.code': 'A' }))).toEqual([
      'validation.min',
    ]);
  });
});

describe('requiredReason', () => {
  const schema = new FormSchemaBuilder(constraints, keyMessages)
    .requiredReason('change_reason')
    .build();

  it('fails below the minimum and passes at the limits', () => {
    expect(messagesOf(schema.safeParse({ change_reason: 'x'.repeat(REASON_MIN - 1) }))).toEqual([
      'validation.min',
    ]);
    expect(schema.safeParse({ change_reason: 'x'.repeat(REASON_MIN) }).success).toBe(true);
    expect(schema.safeParse({ change_reason: 'x'.repeat(REASON_MAX) }).success).toBe(true);
    expect(schema.safeParse({ change_reason: 'x'.repeat(REASON_MAX + OVER_BY_ONE) }).success).toBe(
      false,
    );
  });

  it('is mandatory even if the server minimum is zero', () => {
    const lenient = new FormSchemaBuilder(constraints, keyMessages)
      .requiredReason('optionalReason')
      .build();

    expect(messagesOf(lenient.safeParse({ optionalReason: '  ' }))).toEqual([
      'validation.required',
    ]);
    expect(lenient.safeParse({ optionalReason: 'ok' }).success).toBe(true);
  });
});

describe('configuration errors', () => {
  it('throws when the field is missing from the constraints', () => {
    const builder = new FormSchemaBuilder(constraints, keyMessages);

    expect(() => builder.text('does.not.exist')).toThrow(MissingConstraintError);
    expect(() => builder.requiredReason('does.not.exist')).toThrow(
      'Missing constraint for field "does.not.exist"',
    );
  });

  it('throws when the server pattern is not a valid regular expression', () => {
    const broken: ConstraintsMap = { code: { pattern: '([' } };

    expect(() => new FormSchemaBuilder(broken, keyMessages).text('code')).toThrow(
      InvalidConstraintError,
    );
  });

  it('builds an empty schema when no field was added', () => {
    expect(new FormSchemaBuilder({}, keyMessages).build().parse({})).toEqual({});
  });
});
