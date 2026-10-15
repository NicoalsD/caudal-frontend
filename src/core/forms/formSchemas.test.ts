import { describe, expect, it } from 'vitest';

import type { ConstraintsMap } from './FieldConstraint';
import {
  damageReportFormSchema,
  loginFormSchema,
  readingFormSchema,
  reasonSchema,
} from './formSchemas';
import { keyMessages } from './validationMessages';

const GAUGE = { min: 0, max: 5, decimals: 2 };
const constraints: ConstraintsMap = {
  username: { min: 3, max: 32 },
  password: { min: 12, max: 128 },
  'reading.note': { min: 0, max: 500, maxLines: 10 },
  reason: { min: 10, max: 500 },
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

describe('loginFormSchema', () => {
  const schema = loginFormSchema(constraints, keyMessages);
  const PASSWORD = 'una contraseña larga de prueba';

  it('normalizes the username and keeps the password as typed', () => {
    expect(schema.parse({ username: ' Junta.Uno ', password: PASSWORD })).toEqual({
      username: 'junta.uno',
      password: PASSWORD,
    });
  });

  it('fails with empty fields', () => {
    expect(schema.safeParse({ username: '', password: '' }).success).toBe(false);
  });
});

const DESCRIPTION_MAX = 500;
const PLACE_MAX = 120;

describe('damageReportFormSchema', () => {
  const reportConstraints: ConstraintsMap = {
    'incident.description': { min: 10, max: DESCRIPTION_MAX },
    'incident.location_hint': { min: 0, max: PLACE_MAX },
  };
  const schema = damageReportFormSchema(reportConstraints, keyMessages);
  const valid = {
    category_code: 'LEAK',
    description: '  Hay agua saliendo del tubo.  ',
    location_hint: '',
    website: '',
  };

  it('parses a complete report and trims the texts', () => {
    expect(schema.parse(valid)).toEqual({
      category_code: 'LEAK',
      description: 'Hay agua saliendo del tubo.',
      location_hint: '',
      website: '',
    });
  });

  it('requires a category', () => {
    expect(schema.safeParse({ ...valid, category_code: '' }).success).toBe(false);
  });

  it('keeps the description between the limits of the server', () => {
    expect(schema.safeParse({ ...valid, description: 'corto' }).success).toBe(false);
    expect(
      schema.safeParse({ ...valid, description: 'x'.repeat(DESCRIPTION_MAX + 1) }).success,
    ).toBe(false);
  });

  it('limits the place with the server limit when the server sends it', () => {
    expect(schema.safeParse({ ...valid, location_hint: 'x'.repeat(PLACE_MAX + 1) }).success).toBe(
      false,
    );
  });

  it('accepts a place without a limit from the server, and does not invent a maximum', () => {
    const withoutPlaceLimit = damageReportFormSchema(
      { 'incident.description': { min: 10, max: 500 } },
      keyMessages,
    );
    expect(
      withoutPlaceLimit.safeParse({ ...valid, location_hint: 'x'.repeat(PLACE_MAX + 1) }).success,
    ).toBe(true);
  });
});
