import { http, HttpResponse } from 'msw';

import type { components } from '../../../services/api/schema';
import { buildConstraints } from '../../factories/constraints';
import { apiUrl, originUrl } from '../apiUrl';

type HealthDto = components['schemas']['HealthResponse'];

export const metaHandlers = [
  http.get(originUrl('/actuator/health'), () => HttpResponse.json<HealthDto>({ status: 'UP' })),
  http.get(apiUrl('/meta/constraints'), () => HttpResponse.json(buildConstraints())),
];
