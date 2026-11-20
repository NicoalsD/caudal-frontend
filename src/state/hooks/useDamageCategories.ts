import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import type { CatalogOptionView } from '../../services/api/views';
import { useCaudalApi } from './apiContext';

/** GET /catalogs/DAMAGE_CATEGORY: the damage categories, with labels in Spanish (API.md 4.2). */
export function useDamageCategories(): UseQueryResult<CatalogOptionView[]> {
  const api = useCaudalApi();
  return useQuery({
    queryKey: ['catalog', 'DAMAGE_CATEGORY'],
    queryFn: () => api.catalogs.options('DAMAGE_CATEGORY'),
    refetchOnWindowFocus: false,
  });
}
