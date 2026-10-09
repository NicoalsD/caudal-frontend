import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('joins the present class names with one space', () => {
    expect(cn('header', 'wide')).toBe('header wide');
  });

  it('skips undefined, null, false and empty values', () => {
    expect(cn('header', undefined, null, false, '', 'wide')).toBe('header wide');
  });

  it('returns an empty string when nothing is present', () => {
    expect(cn(undefined)).toBe('');
  });
});
