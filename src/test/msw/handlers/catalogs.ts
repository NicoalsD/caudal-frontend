import { http, HttpResponse } from 'msw';

import { DAMAGE_CATEGORY_ITEMS } from '../../factories/catalogs';
import { apiUrl } from '../apiUrl';

/** Option lists (API.md 4.2): the damage categories of the seed. */
export const catalogHandlers = [
  http.get(apiUrl('/catalogs/:catalog'), ({ params }) =>
    params.catalog === 'DAMAGE_CATEGORY'
      ? HttpResponse.json({ items: DAMAGE_CATEGORY_ITEMS })
      : HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'No encontrado.' } },
          { status: 404 },
        ),
  ),
];
