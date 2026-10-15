import { http, HttpResponse } from 'msw';

import type { components } from '../../../services/api/schema';
import { errorResponse } from '../errorResponse';

import { buildPublicSchedule, PUBLIC_WHATSAPP_TEXT } from '../../factories/public';
import { apiUrl } from '../apiUrl';

/** Public pages (API.md section 15): no session, the default answer is a published schedule. */
const NOT_FOUND_STATUS = 404;

/** The code the backend returns for a new report in the default handler (tests may replace it). */
export const DEFAULT_TRACKING_CODE = '7K2M9QAZ';

export const publicHandlers = [
  http.get(apiUrl('/public/:aqueductSlug/schedule'), () =>
    HttpResponse.json(buildPublicSchedule()),
  ),
  http.post(apiUrl('/public/:aqueductSlug/damage-reports'), () =>
    HttpResponse.json<components['schemas']['DamageReportCreated']>(
      {
        tracking_code: DEFAULT_TRACKING_CODE,
        status: 'REPORTED',
        message: 'Recibimos tu reporte. Guarda el código para consultar su estado.',
      },
      { status: 201 },
    ),
  ),
  http.get(apiUrl('/public/damage-reports/:trackingCode'), ({ params }) =>
    params.trackingCode === DEFAULT_TRACKING_CODE
      ? HttpResponse.json<components['schemas']['PublicDamageReportStatus']>({
          status: 'VERIFYING',
          status_label_es: 'En verificación',
          category_label_es: 'Fuga',
          reported_at: '2026-10-09T14:30:00Z',
          updated_at: '2026-10-09T20:40:00Z',
        })
      : errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND', {
          message: 'No encontramos un reporte con ese código.',
        }),
  ),
  http.get(apiUrl('/public/:aqueductSlug/schedule/whatsapp-text'), () =>
    HttpResponse.text(PUBLIC_WHATSAPP_TEXT, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    }),
  ),
];
