import { describe, expect, it } from 'vitest';

import { PUBLIC_KEY_LENGTH, isValidPublicKey } from './publicKey';

const VALID = 'A'.repeat(PUBLIC_KEY_LENGTH);
const PREFIX_LENGTH = 4;

describe('isValidPublicKey', () => {
  it('accepts 43 base64url characters', () => {
    expect(isValidPublicKey(VALID)).toBe(true);
    expect(isValidPublicKey(`ab-_${'0'.repeat(PUBLIC_KEY_LENGTH - PREFIX_LENGTH)}`)).toBe(true);
  });

  it('ignores surrounding spaces pasted with the key', () => {
    expect(isValidPublicKey(`  ${VALID}\n`)).toBe(true);
  });

  it('rejects other lengths', () => {
    expect(isValidPublicKey('A'.repeat(PUBLIC_KEY_LENGTH - 1))).toBe(false);
    expect(isValidPublicKey('A'.repeat(PUBLIC_KEY_LENGTH + 1))).toBe(false);
    expect(isValidPublicKey('')).toBe(false);
  });

  it('rejects base64 padding and characters outside base64url', () => {
    expect(isValidPublicKey(`${'A'.repeat(PUBLIC_KEY_LENGTH - 1)}=`)).toBe(false);
    expect(isValidPublicKey(`${'A'.repeat(PUBLIC_KEY_LENGTH - 1)}+`)).toBe(false);
  });
});
