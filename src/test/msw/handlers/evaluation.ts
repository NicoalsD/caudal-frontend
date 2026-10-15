import { http, HttpResponse } from 'msw';

import { buildForecastEvaluation } from '../../factories/evaluation';
import { apiUrl } from '../apiUrl';

const DEFAULT_HORIZON_DAYS = 1;

/** Default evaluation for every horizon: the AI is better (API.md 14.1). Tests override it with server.use. */
export const evaluationHandlers = [
  http.get(apiUrl('/forecast-evaluation'), ({ request }) => {
    const horizon = Number(
      new URL(request.url).searchParams.get('horizon_days') ?? DEFAULT_HORIZON_DAYS,
    );
    return HttpResponse.json(buildForecastEvaluation({ horizon_days: horizon }));
  }),
];
