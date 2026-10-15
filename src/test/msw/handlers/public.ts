import { http, HttpResponse } from 'msw';

import { buildPublicSchedule } from '../../factories/public';
import { apiUrl } from '../apiUrl';

/** Public pages (API.md section 15): no session, the default answer is a published schedule. */
export const publicHandlers = [
  http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
    HttpResponse.json(buildPublicSchedule()),
  ),
];
