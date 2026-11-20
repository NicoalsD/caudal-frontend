import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildDeviceDto } from '../../test/factories/devices';
import { PERMISSIONS_BY_ROLE, TEST_AQUEDUCT_ID } from '../../test/factories/auth';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { createDevicesBackend } from '../../test/msw/devicesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TEAM = buildSessionUser({
  role: 'PROJECT_TEAM',
  aqueductId: TEST_AQUEDUCT_ID,
  permissions: [...PERMISSIONS_BY_ROLE.PROJECT_TEAM],
});

describe('Team dashboard', () => {
  it('shows device health, where the pilot decisions came from and open anomalies by kind', async () => {
    server.use(
      ...createDevicesBackend({
        devices: [buildDeviceDto({ name: 'Sensor tanque', last_seen_at: null })],
        pageSize: 10,
      }).handlers,
    );
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    const devices = await screen.findByRole('region', { name: t('teamDashboard.devices.title') });
    expect(await within(devices).findByText('Sensor tanque')).toBeVisible();
    expect(within(devices).getByText(t('teamDashboard.devices.silent'))).toBeVisible();

    expect(
      await screen.findByRole('img', { name: t('teamDashboard.sources.chart') }),
    ).toBeVisible();
    expect(
      await screen.findByRole('img', { name: t('teamDashboard.anomalies.chart') }),
    ).toBeVisible();
    const sources = screen.getByRole('table', {
      name: t('teamDashboard.sources.chart'),
      hidden: true,
    });
    expect(
      within(sources)
        .getAllByRole('cell', { hidden: true })
        .map((c) => c.textContent),
    ).toEqual(['1', '4']);
  });

  it('says so when the devices cannot be read', async () => {
    server.use(http.get(apiUrl('/devices'), () => HttpResponse.json({}, { status: 500 })));
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(await screen.findByText(t('teamDashboard.devices.error'))).toBeVisible();
  });
});
