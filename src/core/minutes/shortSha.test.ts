import { describe, expect, it } from 'vitest';

import { shortSha, SHORT_SHA_LENGTH } from './shortSha';

const HASH = '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b';

describe('shortSha', () => {
  it('keeps the start of the hash and marks the cut', () => {
    expect(shortSha(HASH)).toBe(`${HASH.slice(0, SHORT_SHA_LENGTH)}…`);
  });

  it('shows a short value whole', () => {
    expect(shortSha('abc')).toBe('abc');
  });
});
