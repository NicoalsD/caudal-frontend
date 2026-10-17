import { http, HttpResponse } from 'msw';

import { SEED_SECTORS_LIST, SEED_TANKS, SEED_VALVES } from '../../factories/network';
import { apiUrl } from '../apiUrl';

export const networkHandlers = [
  http.get(apiUrl('/sectors'), () => HttpResponse.json({ items: SEED_SECTORS_LIST })),
  http.get(apiUrl('/tanks'), () => HttpResponse.json({ items: SEED_TANKS })),
  http.get(apiUrl('/sectors/:id/valves'), ({ params }) =>
    HttpResponse.json({ items: SEED_VALVES[String(params.id)] ?? [] }),
  ),
];
