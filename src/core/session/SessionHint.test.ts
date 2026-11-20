import { describe, expect, it } from 'vitest';

import { InMemorySessionHintRepository, opensLocalMode, toSessionHint } from './SessionHint';
import type { SessionUser } from './SessionState';

const NOW = 1_000;
const TTL = 5_000;

const USER: SessionUser = {
  userId: 'u-1',
  username: 'fontanero.uno',
  role: 'OPERATOR',
  aqueductId: 'a-1',
  displayName: 'Persona Uno',
  mustChangePassword: false,
  permissions: [],
  memberships: [],
};

describe('toSessionHint', () => {
  it('keeps only what is shown on screen and an expiry', () => {
    const hint = toSessionHint(USER, NOW, TTL);

    expect(hint).toEqual({
      userId: 'u-1',
      role: 'OPERATOR',
      aqueductId: 'a-1',
      displayName: 'Persona Uno',
      expiresAtMs: NOW + TTL,
    });
    expect(JSON.stringify(hint)).not.toMatch(/token|password|secret|cookie/i);
  });
});

describe('InMemorySessionHintRepository', () => {
  it('keeps one hint per aqueduct without mixing them', () => {
    const repository = new InMemorySessionHintRepository();
    const other = { ...USER, aqueductId: 'a-2', userId: 'u-2' };
    repository.put(toSessionHint(USER, NOW, TTL));
    repository.put(toSessionHint(other, NOW, TTL));

    expect(repository.get('a-1')?.userId).toBe('u-1');
    expect(repository.get('a-2')?.userId).toBe('u-2');
    expect(repository.get('a-3')).toBeNull();
  });

  it('replaces the hint of the same aqueduct when another person signs in', () => {
    const repository = new InMemorySessionHintRepository();
    repository.put(toSessionHint(USER, NOW, TTL));
    repository.put(toSessionHint({ ...USER, userId: 'u-9' }, NOW, TTL));

    expect(repository.get('a-1')?.userId).toBe('u-9');
  });

  it('removes one aqueduct or all of them', () => {
    const repository = new InMemorySessionHintRepository();
    repository.put(toSessionHint(USER, NOW, TTL));
    repository.put(toSessionHint({ ...USER, aqueductId: 'a-2' }, NOW, TTL));

    repository.remove('a-1');
    expect(repository.get('a-1')).toBeNull();
    expect(repository.get('a-2')).not.toBeNull();

    repository.clear();
    expect(repository.get('a-2')).toBeNull();
  });
});

describe('opensLocalMode', () => {
  const hint = toSessionHint(USER, NOW, TTL);

  it('opens for the same aqueduct, the local role and before the expiry', () => {
    expect(opensLocalMode(hint, 'a-1', 'OPERATOR', NOW)).toBe(true);
  });

  it.each([
    ['there is no hint', null, 'a-1', 'OPERATOR', NOW],
    ['it is another aqueduct', hint, 'a-2', 'OPERATOR', NOW],
    ['the role is not the local one', hint, 'a-1', 'BOARD_ADMIN', NOW],
    ['it expired', hint, 'a-1', 'OPERATOR', NOW + TTL],
  ] as const)('does not open when %s', (_name, value, aqueduct, role, now) => {
    expect(opensLocalMode(value, aqueduct, role, now)).toBe(false);
  });
});
