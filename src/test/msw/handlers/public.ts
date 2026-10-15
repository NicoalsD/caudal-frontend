import { http, HttpResponse } from 'msw';

import { buildPublicSchedule, PUBLIC_WHATSAPP_TEXT } from '../../factories/public';
import { apiUrl } from '../apiUrl';

/** Public pages (API.md section 15): no session, the default answer is a published schedule. */
export const publicHandlers = [
  http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
    HttpResponse.json(buildPublicSchedule()),
  ),
  http.get(apiUrl('/public/:aqueductSlug/schedule/whatsapp-text'), () =>
    HttpResponse.text(PUBLIC_WHATSAPP_TEXT, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
  ),
];
