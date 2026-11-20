import { describe, expect, it } from 'vitest';

import { CryptoIdGenerator } from './CryptoIdGenerator';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('CryptoIdGenerator', () => {
  it('returns a new UUID v4 on every call', () => {
    const generator = new CryptoIdGenerator();
    const first = generator.nextId();
    expect(first).toMatch(UUID_V4);
    expect(generator.nextId()).not.toBe(first);
  });
});
