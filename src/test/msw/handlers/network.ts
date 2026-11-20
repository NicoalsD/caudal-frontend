import { http, HttpResponse } from 'msw';

import { SEED_SECTORS_LIST, SEED_TANKS, SEED_VALVES } from '../../factories/network';
import { apiUrl } from '../apiUrl';

export const networkHandlers = [
  http.get(apiUrl('/sectors'), () => HttpResponse.json({ items: SEED_SECTORS_LIST })),
  http.post(apiUrl('/sectors'), async ({ request }) => {
    const body = (await request.json()) as {
      code: string;
      name: string;
      parent_sector_id?: string;
    };
    return HttpResponse.json(
      {
        id: '0190f3a2-0000-7000-8000-00000000aa01',
        code: body.code,
        name: body.name,
        parent_sector_id: body.parent_sector_id ?? null,
        households_count: 0,
        is_active: true,
        is_region: body.parent_sector_id === undefined,
      },
      { status: 201 },
    );
  }),
  http.patch(apiUrl('/sectors/:id'), async ({ params, request }) => {
    const body = (await request.json()) as { name?: string; parent_sector_id?: string };
    const found = SEED_SECTORS_LIST.find((sector) => sector.id === params.id);
    return found === undefined
      ? HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 })
      : HttpResponse.json({ ...found, ...body });
  }),
  http.get(apiUrl('/tanks'), () => HttpResponse.json({ items: SEED_TANKS })),
  http.get(apiUrl('/sectors/:id/valves'), ({ params }) =>
    HttpResponse.json({ items: SEED_VALVES[String(params.id)] ?? [] }),
  ),
];
