import { http, HttpResponse } from 'msw';

import { buildAnomaly } from '../../factories/status';
import { apiUrl } from '../apiUrl';

/** Default anomalies: one open anomaly. Tests that need others use server.use (API.md 9). */
export const anomaliesHandlers = [
  http.get(apiUrl('/anomalies'), () =>
    HttpResponse.json({ items: [buildAnomaly()], next_cursor: null }),
  ),
  http.patch(apiUrl('/anomalies/:id'), async ({ params, request }) => {
    const body = (await request.json()) as { status: string };
    return HttpResponse.json(
      buildAnomaly({ id: String(params.id), status: body.status as 'CONFIRMED' | 'DISMISSED' }),
    );
  }),
];
