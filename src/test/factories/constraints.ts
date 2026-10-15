import type { components } from '../../services/api/schema';

export type ConstraintsDto = components['schemas']['ConstraintsResponse'];

/** Neutral limits that mirror the shape of API.md section 4.1. Not real production limits. */
export function buildConstraints(overrides: ConstraintsDto = {}): ConstraintsDto {
  return {
    username: { min: 3, max: 32 },
    password: { min: 12, max: 128 },
    'reading.note': { min: 0, max: 500, max_lines: 10 },
    reason: { min: 10, max: 500 },
    'sector.code': { min: 2, max: 20, pattern: '^[A-Z0-9-]+$' },
    'incident.description': { min: 10, max: 500 },
    'incident.location_hint': { min: 0, max: 120 },
    tracking_code: { min: 8, max: 8, pattern: '^[0-9A-HJKMNP-TV-Z]+$' },
    ...overrides,
  };
}
