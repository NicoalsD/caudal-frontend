import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ApiProvider } from '../app/providers/ApiProvider';
import { ApiDtoAdapter } from '../services/api/adapters/ApiDtoAdapter';
import { CaudalApi } from '../services/api/CaudalApi';
import { BaseFetchHttpClient } from '../services/http/BaseFetchHttpClient';

/** A real CaudalApi over fetch; MSW answers the requests. */
export function createTestApi(): CaudalApi {
  return new CaudalApi(
    new BaseFetchHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL }),
    new ApiDtoAdapter(),
  );
}

/** A query client that does not retry or cache between tests. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

export function renderHookWithApi<Result>(
  hook: () => Result,
  api: CaudalApi = createTestApi(),
  client: QueryClient = createTestQueryClient(),
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiProvider api={api}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ApiProvider>
  );
  return renderHook(hook, { wrapper });
}
