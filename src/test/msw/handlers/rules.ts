import { http, HttpResponse } from 'msw';

import { buildRuleSet } from '../../factories/rules';
import { apiUrl } from '../apiUrl';

/** Default rules: the seed as the ACTIVE version and no draft. Tests that edit use rulesBackend. */
export const rulesHandlers = [
  http.get(apiUrl('/rule-sets/current'), () => HttpResponse.json(buildRuleSet())),
  http.get(apiUrl('/rule-sets'), () => HttpResponse.json({ items: [], next_cursor: null })),
];
