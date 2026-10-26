import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { formatDayKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { buildForecastRun } from '../../test/factories/status';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const BOARD = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['STATUS_VIEW', 'FORECAST_RUN'],
});
const OPERATOR = buildSessionUser({ role: 'OPERATOR', permissions: ['STATUS_VIEW'] });
const CREATED = 201;
const NOT_FOUND = 404;
const UNPROCESSABLE = 422;
const TOO_MANY = 429;
const RETRY_AFTER_SECONDS = 1500;

const NEW_RUN = buildForecastRun({
  run_id: '6f1d2c3a-0000-4000-8000-000000000002',
  model_name: 'chronos-bolt-tiny',
  points: [{ target_date: '2026-10-17', p10: 1.5, p50: 1.7, p90: 1.9 }],
});

function runButton(): Promise<HTMLElement> {
  return screen.findByRole('button', { name: t('forecast.run') });
}

describe('ForecastRunAction (S12 recalculate the forecast)', () => {
  it('hides the button from a person without FORECAST_RUN', async () => {
    renderApp(ROUTE_PATHS.tank, { user: OPERATOR });

    await screen.findByRole('note');
    expect(screen.queryByRole('button', { name: t('forecast.run') })).not.toBeInTheDocument();
  });

  it('asks for a new run and shows its days in place of the old ones', async () => {
    const sent: unknown[] = [];
    server.use(
      http.post(apiUrl('/tanks/:id/forecasts'), async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(NEW_RUN, { status: CREATED });
      }),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    await user.click(await runButton());

    expect(await screen.findByText(t('forecast.runDoneAi'))).toBeVisible();
    expect(sent).toEqual([{}]);
    expect(
      screen.getByText(
        t('forecast.summary', {
          day: formatDayKey('2026-10-17'),
          median: '1,7',
          low: '1,5',
          high: '1,9',
        }),
      ),
    ).toBeVisible();
    expect(
      screen.getByText(t('forecast.model', { name: 'chronos-bolt-tiny' }), { exact: false }),
    ).toBeVisible();
  });

  it('says the AI did not answer when the new run is the simple estimate', async () => {
    server.use(
      http.post(apiUrl('/tanks/:id/forecasts'), () =>
        HttpResponse.json(buildForecastRun({ is_fallback: true, fallback_reason: 'IA_TIMEOUT' }), {
          status: CREATED,
        }),
      ),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    await user.click(await runButton());

    expect(await screen.findByText(t('forecast.runDoneEstimate'))).toBeVisible();
    expect(
      screen.getByText(t('forecast.sourceEstimateText', { reason: t('forecast.reasonTimeout') })),
    ).toBeVisible();
  });

  it('offers the button on a tank that was never forecast', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/forecasts/latest'), () => errorResponse(NOT_FOUND, 'NOT_FOUND')),
      http.post(apiUrl('/tanks/:id/forecasts'), () =>
        HttpResponse.json(NEW_RUN, { status: CREATED }),
      ),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    expect(await screen.findByText(t('forecast.none'))).toBeVisible();
    await user.click(await runButton());

    expect(await screen.findByText(t('forecast.runDoneAi'))).toBeVisible();
    expect(screen.queryByText(t('forecast.none'))).not.toBeInTheDocument();
  });

  it('says how long to wait when the hourly limit is reached', async () => {
    server.use(
      http.post(apiUrl('/tanks/:id/forecasts'), () =>
        errorResponse(TOO_MANY, 'RATE_LIMITED', {
          headers: { 'Retry-After': String(RETRY_AFTER_SECONDS) },
        }),
      ),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    await user.click(await runButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      t('forecast.runRateLimitedWait', { minutes: '25' }),
    );
  });

  it('asks for a reading when the tank has no recent level', async () => {
    server.use(
      http.post(apiUrl('/tanks/:id/forecasts'), () =>
        errorResponse(UNPROCESSABLE, 'NO_LEVEL_DATA'),
      ),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    await user.click(await runButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('forecast.runNoLevelData'));
  });
});
