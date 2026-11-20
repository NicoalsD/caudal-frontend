import { http, HttpResponse } from 'msw';

import { buildNarrativeReport, buildReport } from '../../factories/reports';
import { apiUrl } from '../apiUrl';

/** Default answers of the reports (API.md 20.9 and 20.10). */
export const reportsHandlers = [
  http.get(apiUrl('/reports'), ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      buildReport({
        from: url.searchParams.get('from') ?? '',
        to: url.searchParams.get('to') ?? '',
      }),
    );
  }),
  http.post(apiUrl('/reports/narrative'), () => HttpResponse.json(buildNarrativeReport())),
];
