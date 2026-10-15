import { http } from 'msw';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { formatDayKey } from '../../core/format/time';
import { buildSessionUser } from '../../test/factories/session';
import { buildTankStatus } from '../../test/factories/status';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const BOARD = buildSessionUser({ role: 'BOARD_MEMBER' });
const INTERNAL_ERROR = 500;
const STALE_HOURS = 12;

function renderStatus() {
  return renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
}

describe('TankStatusPage (S12 status block)', () => {
  it('shows the last level with a decimal comma, its age and the trend in words', async () => {
    renderStatus();

    expect(await screen.findByText(t('tankStatus.levelValue', { value: '2,3' }))).toBeVisible();
    expect(screen.getByText(t('tankStatus.takenAgo', { hours: '6' }))).toBeVisible();
    expect(screen.getByText(t('tankStatus.trendDown'))).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('states the likely level and its range for each forecast day in plain words', async () => {
    renderStatus();

    expect(
      await screen.findByText(
        t('forecast.summary', {
          day: formatDayKey('2026-10-15'),
          median: '2,2',
          low: '2',
          high: '2,4',
        }),
      ),
    ).toBeVisible();
    expect(screen.getByRole('img', { name: t('forecast.chartLabel') })).toBeInTheDocument();
  });

  it('warns that the last reading is older than the limit the status sends', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/status'), () =>
        Response.json(
          buildTankStatus({ stale: { is_stale: true, stale_after_hours: STALE_HOURS } }),
        ),
      ),
    );
    renderStatus();

    expect(
      await screen.findByText(t('tankStatus.staleText', { hours: String(STALE_HOURS) })),
    ).toBeVisible();
  });

  it('does not warn when the last reading is recent', async () => {
    renderStatus();

    await screen.findByText(t('tankStatus.levelValue', { value: '2,3' }));
    expect(screen.queryByText(t('tankStatus.staleTitle'))).not.toBeInTheDocument();
  });

  it('says there are no readings yet when the tank has no level', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/status'), () =>
        Response.json(
          buildTankStatus({
            level: null,
            band: null,
            trend: { slope_per_day: 0, label: 'STABLE' },
          }),
        ),
      ),
    );
    renderStatus();

    expect(await screen.findByText(t('tankStatus.noLevel'))).toBeVisible();
  });

  it('offers a retry when the status does not load', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/status'), () => errorResponse(INTERNAL_ERROR, 'INTERNAL_ERROR')),
    );
    renderStatus();

    expect(await screen.findByRole('button', { name: t('common.retry') })).toBeVisible();
  });
});
