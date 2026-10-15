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
  username: { min: 3, max: 32, pattern: '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$' },
  password: { min: 12, max: 128 },
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
  it('reads the limits of the constraint named in the options', () => {
    const named: ConstraintsMap = { reason: { min: REASON_MIN, max: REASON_MAX } };
    const schema = new FormSchemaBuilder(named, keyMessages)
      .requiredReason('change_reason', { constraint: 'reason' })
      .build();

    expect(messagesOf(schema.safeParse({ change_reason: 'x'.repeat(REASON_MIN - 1) }))).toEqual([
      'validation.min',
    ]);
    expect(schema.safeParse({ change_reason: 'x'.repeat(REASON_MIN) }).success).toBe(true);
  });

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

describe('username text', () => {
  const schema = new FormSchemaBuilder(constraints, keyMessages)
    .text('username', { lowercase: true })
    .build();

  it('lowers the case before applying the server pattern', () => {
    expect(schema.parse({ username: '  Junta.Presidencia ' })).toEqual({
      username: 'junta.presidencia',
    });
  });

  it('keeps rejecting what the pattern rejects', () => {
    expect(messagesOf(schema.safeParse({ username: '.junta' }))).toEqual(['validation.pattern']);
  });
});

describe('password fields', () => {
  const MIN_LENGTH = 12;
  const MAX_LENGTH = 128;
  const schema = new FormSchemaBuilder(constraints, keyMessages).password('password').build();
  const lenient = new FormSchemaBuilder(constraints, keyMessages)
    .password('current', { constraint: 'password', anyLength: true })
    .build();

  it('never trims or alters the value', () => {
    const typed = `  ${'a'.repeat(MIN_LENGTH)}  `;

    expect(schema.parse({ password: typed })).toEqual({ password: typed });
  });

  it('requires the value, then the server minimum and maximum', () => {
    expect(messagesOf(schema.safeParse({ password: '' }))).toEqual(['validation.required']);
    expect(messagesOf(schema.safeParse({ password: 'a'.repeat(MIN_LENGTH - 1) }))).toEqual([
      'validation.min',
    ]);
    expect(schema.safeParse({ password: 'a'.repeat(MAX_LENGTH) }).success).toBe(true);
    expect(messagesOf(schema.safeParse({ password: 'a'.repeat(MAX_LENGTH + 1) }))).toEqual([
      'validation.max',
    ]);
  });

  it('can accept any length up to the maximum for an existing password', () => {
    expect(lenient.safeParse({ current: 'x' }).success).toBe(true);
    expect(messagesOf(lenient.safeParse({ current: '' }))).toEqual(['validation.required']);
    expect(lenient.safeParse({ current: 'a'.repeat(MAX_LENGTH + 1) }).success).toBe(false);
  });

  it('throws when the constraint is missing', () => {
    expect(() => new FormSchemaBuilder({}, keyMessages).password('password')).toThrow(
      MissingConstraintError,
    );
  });
});

describe('cross-field checks', () => {
  const NEW_PASSWORD = 'una-clave-larga-y-distinta';
  const build = () =>
    new FormSchemaBuilder(constraints, keyMessages)
      .password('current', { constraint: 'password', anyLength: true })
      .password('next', { constraint: 'password' })
      .password('again', { constraint: 'password' })
      .differentFrom('next', 'current')
      .notContaining('next', 'Junta.Uno')
      .confirmation('again', 'next')
      .build();
  const valid = { current: 'clave-actual', next: NEW_PASSWORD, again: NEW_PASSWORD };

  function issuesOf(values: Record<string, string>): [string, string][] {
    const result = build().safeParse(values);
    return result.success
      ? []
      : result.error.issues.map((issue) => [String(issue.path[0]), issue.message]);
  }

  it('passes when every rule holds', () => {
    expect(build().safeParse(valid).success).toBe(true);
  });

  it('reports a confirmation that does not match on the confirmation field', () => {
    expect(issuesOf({ ...valid, again: `${NEW_PASSWORD}x` })).toEqual([
      ['again', 'validation.mismatch'],
    ]);
  });

  it('rejects a new password equal to the current one', () => {
    const same = 'la-misma-clave-larga';

    expect(issuesOf({ current: same, next: same, again: same })).toEqual([
      ['next', 'validation.sameAsCurrent'],
    ]);
  });

  it('rejects a password that contains the username, ignoring case', () => {
    const withUser = 'xxjunta.UNOxxxxxx';

    expect(issuesOf({ current: 'clave-actual', next: withUser, again: withUser })).toEqual([
      ['next', 'validation.containsUsername'],
    ]);
  });

  it('never fails the username rule when the term is empty', () => {
    const schema = new FormSchemaBuilder(constraints, keyMessages)
      .password('next', { constraint: 'password' })
      .notContaining('next', '  ')
      .build();

    expect(schema.safeParse({ next: NEW_PASSWORD }).success).toBe(true);
  });
});

const BAND_DECIMALS = 2;
const HOURS_IN_DAY = 24;
describe('bandList', () => {
  const GAUGE_RULE = {
    gauge: { min: 0, max: 5, step: 0.01 },
    decimals: BAND_DECIMALS,
    maxHoursPerDay: HOURS_IN_DAY,
  };
  const schema = new FormSchemaBuilder({}, keyMessages).bandList('bands', GAUGE_RULE).build();
  const row = (band: string, from: string, to: string, hours: string, only = false) => ({
    band,
    min_level: from,
    max_level: to,
    daily_service_hours: hours,
    priority_only: only,
  });
  const highRow = row('HIGH', '3,5', '5', '16');
  const criticalRow = row('CRITICAL', '0', '1,5', '3', true);
  const seed = [highRow, row('LOW', '1,5', '3,5', '8'), criticalRow];

  function issues(bands: ReturnType<typeof row>[]): [string, string][] {
    const result = schema.safeParse({ bands });
    return result.success
      ? []
      : result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
  }

  it('parses the seed into numbers and keeps the band codes', () => {
    expect(schema.parse({ bands: seed }).bands).toEqual([
      { band: 'HIGH', min_level: 3.5, max_level: 5, daily_service_hours: 16, priority_only: false },
      { band: 'LOW', min_level: 1.5, max_level: 3.5, daily_service_hours: 8, priority_only: false },
      {
        band: 'CRITICAL',
        min_level: 0,
        max_level: 1.5,
        daily_service_hours: 3,
        priority_only: true,
      },
    ]);
  });

  it('reports the gap with its limits', () => {
    const withGap = [highRow, row('LOW', '1,5', '3', '8'), criticalRow];

    expect(issues(withGap)).toEqual([['bands', 'validation.bandGap']]);
  });

  it('reports the overlap', () => {
    const overlapping = [highRow, row('LOW', '1,5', '3,6', '8'), criticalRow];

    expect(issues(overlapping)).toEqual([['bands', 'validation.bandOverlap']]);
  });

  it('puts "top must be above bottom" on the top field of that row', () => {
    const inverted = [highRow, row('LOW', '3,5', '1,5', '8'), criticalRow];

    expect(issues(inverted).map(([path]) => path)).toContain('bands.1.max_level');
  });

  it('checks each number against the tank range and the hours of a day', () => {
    const outside = [row('HIGH', '3,5', '6', '25')];

    expect(issues(outside)).toEqual([
      ['bands.0.max_level', 'validation.rangeMax'],
      ['bands.0.daily_service_hours', 'validation.rangeMax'],
    ]);
  });

  it('refuses more decimals than the gauge step and text that is not a number', () => {
    expect(issues([row('HIGH', '3,555', '5', 'abc')]).map(([, message]) => message)).toEqual([
      'validation.decimalPlaces',
      'validation.number',
    ]);
  });

  it('follows the gauge of the rule set (a bigger tank accepts bigger levels)', () => {
    const bigger = new FormSchemaBuilder({}, keyMessages)
      .bandList('bands', { ...GAUGE_RULE, gauge: { min: 0, max: 8, step: 0.01 } })
      .build();

    expect(bigger.safeParse({ bands: [row('HIGH', '0', '8', '10')] }).success).toBe(true);
    expect(schema.safeParse({ bands: [row('HIGH', '0', '8', '10')] }).success).toBe(false);
  });

  it('asks for coverage when there are no rows at all', () => {
    expect(issues([])).toEqual([['bands', 'validation.bandGap']]);
  });
});
