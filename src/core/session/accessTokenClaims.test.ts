import { describe, expect, it } from 'vitest';

import { readAccessTokenClaims } from './accessTokenClaims';

function token(payload: unknown): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.firma`;
}

const CLAIMS = { sub: 'u-1', role: 'BOARD_ADMIN', aqueduct_id: 'a-1' };

describe('readAccessTokenClaims', () => {
  it('reads subject, role and aqueduct', () => {
    expect(readAccessTokenClaims(token(CLAIMS))).toEqual({
      subject: 'u-1',
      role: 'BOARD_ADMIN',
      aqueductId: 'a-1',
    });
  });

  it('reads accents in base64url payloads', () => {
    expect(readAccessTokenClaims(token({ ...CLAIMS, sub: 'añ?>' }))?.subject).toBe('añ?>');
  });

  it.each([
    ['not a JWT', 'abc'],
    ['two parts', 'a.b'],
    ['payload not base64', 'a.@@@.c'],
    ['payload not JSON', `a.${btoa('no json')}.c`],
    ['payload is an array', token([])],
    ['payload is null', token(null)],
    ['unknown role', token({ ...CLAIMS, role: 'ROOT' })],
    ['missing aqueduct', token({ sub: 'u', role: 'OPERATOR' })],
    ['missing subject', token({ role: 'OPERATOR', aqueduct_id: 'a' })],
  ])('returns null for %s', (_name, value) => {
    expect(readAccessTokenClaims(value)).toBeNull();
  });
});
