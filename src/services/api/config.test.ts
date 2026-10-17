import { describe, expect, it } from 'vitest';

import { readApiBaseUrl } from './config';

describe('readApiBaseUrl', () => {
  it('returns the configured URL without trailing slashes', () => {
    expect(readApiBaseUrl({ VITE_API_BASE_URL: ' http://localhost:8080/api/v1/ ' })).toBe(
      'http://localhost:8080/api/v1',
    );
  });

  it.each([undefined, '', '   '])('fails when the variable is %j', (value) => {
    const env = value === undefined ? {} : { VITE_API_BASE_URL: value };
    expect(() => readApiBaseUrl(env)).toThrow('VITE_API_BASE_URL is required');
  });
});
