import { http, HttpResponse } from 'msw';

import { buildForecastRun, buildTankStatus } from '../../factories/status';
import { SEED_TANKS } from '../../factories/network';
import { apiUrl } from '../apiUrl';
import { errorResponse } from '../errorResponse';

const NOT_FOUND_STATUS = 404;

/** Default tank status for the seed tank (API.md 8.1). Tests that need another state use server.use. */
export const statusHandlers = [
  http.get(apiUrl('/tanks/:id/status'), ({ params }) =>
    params.id === SEED_TANKS[0]?.id
      ? HttpResponse.json(buildTankStatus())
      : errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND'),
  ),
  http.get(apiUrl('/tanks/:id/forecasts/latest'), ({ params }) =>
    params.id === SEED_TANKS[0]?.id
      ? HttpResponse.json(buildForecastRun())
      : errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND'),
  ),
];
