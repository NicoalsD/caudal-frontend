import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { STATUS } from '../../test/constants';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderHookWithApi } from '../../test/renderWithProviders';
import { useCaudalApi } from './apiContext';
import { useConstraints } from './useConstraints';

const NOTE_MAX = 500;
const NOTE_LINES = 10;

describe('useConstraints', () => {
  it('starts loading with no data, so no form is armed with defaults', () => {
    const { result } = renderHookWithApi(() => useConstraints());

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('delivers the limits of the server in camelCase', async () => {
    const { result } = renderHookWithApi(() => useConstraints());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.['reading.note']).toEqual({
      min: 0,
      max: NOTE_MAX,
      maxLines: NOTE_LINES,
    });
  });

  it('exposes the typed error when the server fails', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        errorResponse(STATUS.badGateway, 'INTERNAL_ERROR'),
      ),
    );
    const { result } = renderHookWithApi(() => useConstraints());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCaudalApi', () => {
  it('fails outside an ApiProvider', () => {
    expect(() => renderHook(() => useCaudalApi())).toThrow('inside an ApiProvider');
  });
});
