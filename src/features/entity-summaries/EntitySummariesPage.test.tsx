import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const ENTITY = buildSessionUser({ role: 'SUPPORT_ENTITY', permissions: ['SUMMARY_VIEW'] });

describe('Entity summaries with charts', () => {
  it('charts the four counts of the summaries and keeps the same numbers in a table', async () => {
    server.use(
      http.get(apiUrl('/summaries'), () =>
        HttpResponse.json({
          items: [
            {
              summary_share_id: '0190f3a2-0000-7000-8000-0000000000aa',
              scope: 'MONTHLY_SUMMARY',
              period_from: '2026-10-01',
              period_to: '2026-10-31',
              content: { observed: 12, estimated: 3, inferred: 2, confirmed: 1 },
            },
          ],
          next_cursor: null,
        }),
      ),
    );
    renderApp(ROUTE_PATHS.entity.summaries, { user: ENTITY });

    expect(await screen.findByRole('img', { name: t('entitySummaries.chart') })).toBeVisible();
    const table = screen.getByRole('table', { name: t('entitySummaries.chart'), hidden: true });
    expect(
      within(table)
        .getAllByRole('cell', { hidden: true })
        .map((c) => c.textContent),
    ).toEqual(['12', '3', '2', '1']);
  });
});
