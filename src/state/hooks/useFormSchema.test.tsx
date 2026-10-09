import { waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { loginFormSchema } from '../../core/forms/formSchemas';
import { STATUS } from '../../test/constants';
import { buildConstraints } from '../../test/factories/constraints';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderHookWithApi } from '../../test/renderWithProviders';
import { useFormSchema } from './useFormSchema';

describe('useFormSchema', () => {
  it('is loading first and ready once the limits arrive', async () => {
    const { result } = renderHookWithApi(() => useFormSchema(loginFormSchema));

    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
  });

  it('stays closed when the limits cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.unprocessable, 'VALIDATION_ERROR'),
      ),
    );
    const { result } = renderHookWithApi(() => useFormSchema(loginFormSchema));

    await waitFor(() => {
      expect(result.current.status).toBe('unavailable');
    });
  });

  it('reports a configuration error when the server omits a needed limit', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        Response.json({ ...buildConstraints(), password: undefined }),
      ),
    );
    const { result } = renderHookWithApi(() => useFormSchema(loginFormSchema));

    await waitFor(() => {
      expect(result.current.status).toBe('misconfigured');
    });
  });
});
