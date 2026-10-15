import type { components } from '../../services/api/schema';

type CatalogItemDto = components['schemas']['CatalogItem'];

/** The damage categories of the seed (API.md 4.2), in the order the server sends them. */
export const DAMAGE_CATEGORY_ITEMS: readonly CatalogItemDto[] = [
  { code: 'LEAK', label_es: 'Fuga', sort_order: 1 },
  { code: 'BROKEN_PIPE', label_es: 'Tubo roto', sort_order: 2 },
  { code: 'NO_WATER', label_es: 'Sin agua', sort_order: 3 },
  { code: 'DIRTY_WATER', label_es: 'Agua sucia', sort_order: 4 },
  { code: 'VALVE_FAILURE', label_es: 'Falla de válvula', sort_order: 5 },
  { code: 'OTHER', label_es: 'Otro', sort_order: 6 },
];
