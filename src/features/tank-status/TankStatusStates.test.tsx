import { http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { SEED_TANKS } from '../../test/factories/network';
import { buildTankStatus } from '../../test/factories/status';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const BOARD = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['STATUS_VIEW', 'ANOMALY_REVIEW'],
});
const NOT_FOUND = 404;
const INTERNAL_ERROR = 500;

function renderStatus() {
  return renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
}

describe('TankStatusPage states (S12): empty, error and fallback', () => {
  it('says there is no active tank when the aqueduct has none', async () => {
    server.use(
      http.get(apiUrl('/tanks'), () =>
        HttpResponse.json({ items: SEED_TANKS.map((tank) => ({ ...tank, is_active: false })) }),
      ),
    );
    renderStatus();

    expect(await screen.findByText(t('tankStatus.noTank'))).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('lets the person pick among several active tanks', async () => {
    const second = {
      ...SEED_TANKS[0],
      id: '7c1e0000-0000-4000-8000-000000000002',
      name: 'Tanque alto',
    };
    server.use(
      http.get(apiUrl('/tanks'), () => HttpResponse.json({ items: [...SEED_TANKS, second] })),
      http.get(apiUrl('/tanks/:id/status'), () => HttpResponse.json(buildTankStatus())),
    );
    renderStatus();
    const user = userEvent.setup();

    const picker = await screen.findByRole('combobox', { name: t('tankStatus.tankPicker') });
    await user.selectOptions(picker, second.id);
    expect(picker).toHaveValue(second.id);
  });

  it('shows a plain "no forecast yet" line when the tank was never forecast', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/forecasts/latest'), () => errorResponse(NOT_FOUND, 'NOT_FOUND')),
    );
    renderStatus();

    expect(await screen.findByText(t('forecast.none'))).toBeVisible();
    expect(screen.queryByRole('img', { name: t('forecast.chartLabel') })).not.toBeInTheDocument();
  });

  it('keeps the status visible and offers a retry when the forecast fails', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/forecasts/latest'), () =>
        errorResponse(INTERNAL_ERROR, 'INTERNAL_ERROR'),
      ),
    );
    renderStatus();

    expect(await screen.findByText(t('tankStatus.levelValue', { value: '2,3' }))).toBeVisible();
    const forecast = screen.getByRole('region', { name: t('forecast.title') });
    expect(await within(forecast).findByRole('button', { name: t('common.retry') })).toBeVisible();
  });

  it('offers a retry when the open anomalies fail to load', async () => {
    server.use(
      http.get(apiUrl('/anomalies'), () => errorResponse(INTERNAL_ERROR, 'INTERNAL_ERROR')),
    );
    renderStatus();

    const anomalies = await screen.findByRole('region', { name: t('anomalies.title') });
    expect(await within(anomalies).findByRole('button', { name: t('common.retry') })).toBeVisible();
  });
});
