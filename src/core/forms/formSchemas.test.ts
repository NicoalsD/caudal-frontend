import { describe, expect, it } from 'vitest';

import type { ConstraintsMap } from './FieldConstraint';
import { readingFormSchema, reasonSchema } from './formSchemas';
import { keyMessages } from './validationMessages';

const GAUGE = { min: 0, max: 5, decimals: 2 };
const constraints: ConstraintsMap = {
  'reading.note': { min: 0, max: 500, maxLines: 10 },
  change_reason: { min: 10, max: 500 },
};
const LEVEL = 2.1;

describe('readingFormSchema', () => {
  const schema = readingFormSchema(constraints, GAUGE, keyMessages);

  it('parses a valid reading form', () => {
    expect(schema.parse({ gauge_value: '2,1', 'reading.note': ' agua clara ' })).toEqual({
      gauge_value: LEVEL,
      'reading.note': 'agua clara',
    });
  });

  it('fails when the gauge is outside the rule range', () => {
    expect(schema.safeParse({ gauge_value: '9', 'reading.note': '' }).success).toBe(false);
  });
});

describe('reasonSchema', () => {
  const schema = reasonSchema(constraints, keyMessages);

  it('requires the reason', () => {
    expect(schema.safeParse({ change_reason: '' }).success).toBe(false);
    expect(
      schema.safeParse({ change_reason: 'Sube la reserva por la temporada seca.' }).success,
    ).toBe(true);
  });
});
