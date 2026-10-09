import { describe, expect, it } from 'vitest';

import { createCaudalApi } from './createCaudalApi';

describe('createCaudalApi', () => {
  it('builds a working facade from the environment', async () => {
    const api = createCaudalApi({ VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL });

    expect(await api.system.health()).toEqual({ isUp: true });
  });

  it('fails fast when the API base URL is missing', () => {
    expect(() => createCaudalApi({})).toThrow('VITE_API_BASE_URL is required');
  });
});
