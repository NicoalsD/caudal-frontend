import { http, HttpResponse } from 'msw';

import { SEED_SECTORS_LIST } from '../../factories/network';
import { apiUrl } from '../apiUrl';

export const networkHandlers = [
  http.get(apiUrl('/sectors'), () => HttpResponse.json({ items: SEED_SECTORS_LIST })),
];
