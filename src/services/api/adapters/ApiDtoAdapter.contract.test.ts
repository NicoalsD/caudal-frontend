import fc from 'fast-check';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { formatDecimal, parseDecimalInput } from '../../../core/format/decimal';
import type { components } from '../schema';
import { ApiDtoAdapter } from './ApiDtoAdapter';

type FieldConstraintDto = components['schemas']['FieldConstraint'];
type ErrorBodyDto = components['schemas']['ErrorBody'];

const adapter = new ApiDtoAdapter();

const LIMIT_MAX = 2_000;
const CENTS_MAX = 99_999;
const CENTS_PER_UNIT = 100;
const TWO_DIGITS = 2;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60_000;
const YEAR_2026 = 2026;
const START_OF_2026 = Date.UTC(YEAR_2026, 0, 1);
const DAYS_IN_YEAR = 365;

describe('contract with the generated types', () => {
  it('the field limits of the DTO are exactly min, max, pattern and max_lines', () => {
    expectTypeOf<keyof FieldConstraintDto>().toEqualTypeOf<
      'min' | 'max' | 'pattern' | 'max_lines'
    >();
  });

  it('the canonical error keeps request_id in snake_case and requires code and message', () => {
    expectTypeOf<ErrorBodyDto['request_id']>().toEqualTypeOf<string>();
    expectTypeOf<ErrorBodyDto['code']>().toEqualTypeOf<string>();
    expectTypeOf<ErrorBodyDto['message']>().toEqualTypeOf<string>();
    expectTypeOf<ErrorBodyDto['details']>().toEqualTypeOf<Record<string, unknown> | undefined>();
  });

  it('the constraints view never exposes snake_case names', () => {
    const view = adapter.toConstraints({ f: { min: 1, max: LIMIT_MAX, max_lines: 1 } });

    expect(Object.keys(view.f ?? {}).every((name) => !name.includes('_'))).toBe(true);
  });
});

describe('toConstraints (properties)', () => {
  const limit = fc.record(
    {
      min: fc.nat({ max: LIMIT_MAX }),
      max: fc.nat({ max: LIMIT_MAX }),
      pattern: fc.constantFrom('^[A-Z]+$', '^\\d+$'),
      max_lines: fc.nat({ max: LIMIT_MAX }),
    },
    { requiredKeys: [] },
  );

  it('keeps every field name and every value, and invents nothing', () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string({ minLength: 1 }), limit), (dto) => {
        const view = adapter.toConstraints(dto);

        expect(Object.keys(view).sort()).toEqual(Object.keys(dto).sort());
        for (const [field, limits] of Object.entries(dto)) {
          const mapped = view[field];
          expect(mapped?.min).toBe(limits.min);
          expect(mapped?.max).toBe(limits.max);
          expect(mapped?.pattern).toBe(limits.pattern);
          expect(mapped?.maxLines).toBe(limits.max_lines);
          expect(Object.keys(mapped ?? {}).length).toBe(Object.keys(limits).length);
        }
      }),
    );
  });
});

describe('toDecimal (properties)', () => {
  it('text with comma parses back to the same number for up to two decimals', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: CENTS_MAX }), (cents) => {
        const view = adapter.toDecimal('gauge_value', cents / CENTS_PER_UNIT, TWO_DIGITS);

        expect(view.value).toBe(cents / CENTS_PER_UNIT);
        expect(view.text).toBe(formatDecimal(view.value, TWO_DIGITS));
        expect(parseDecimalInput(view.text.replaceAll('.', ''))).toBe(view.value);
      }),
    );
  });
});

describe('toTimestamp (properties)', () => {
  const instants = fc
    .integer({ min: 0, max: DAYS_IN_YEAR * HOURS_PER_DAY * MINUTES_PER_HOUR })
    .map((minutes) => new Date(START_OF_2026 + minutes * MS_PER_MINUTE).toISOString());

  it('is the same whatever time zone the device uses', () => {
    const originalZone = process.env.TZ;
    try {
      fc.assert(
        fc.property(instants, (iso) => {
          process.env.TZ = 'UTC';
          const inUtc = adapter.toTimestamp('observed_at', iso);
          process.env.TZ = 'Asia/Tokyo';
          const inTokyo = adapter.toTimestamp('observed_at', iso);

          expect(inTokyo.text).toBe(inUtc.text);
          expect(inTokyo.dayKey).toBe(inUtc.dayKey);
        }),
      );
    } finally {
      if (originalZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalZone;
      }
    }
  });

  it('keeps the instant: the Date round-trips to the same ISO string', () => {
    fc.assert(
      fc.property(instants, (iso) => {
        expect(adapter.toTimestamp('observed_at', iso).date.toISOString()).toBe(iso);
      }),
    );
  });
});
