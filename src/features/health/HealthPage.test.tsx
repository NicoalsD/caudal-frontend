import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import packageJson from '../../../package.json';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { originUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const SERVICE_UNAVAILABLE_STATUS = 503;
const OK_STATUS = 200;
const INTERNAL_ERROR_STATUS = 500;
const TWO_CALLS = 2;
const user = () => buildSessionUser({ role: 'PROJECT_TEAM', permissions: ['RULESET_VIEW'] });

/** Serves the actuator (outside /api/v1) and counts the calls. */
function serveHealth(
  body: Record<string, unknown>,
  status = OK_STATUS,
): { readonly urls: string[] } {
  const urls: string[] = [];
  server.use(
    http.get(originUrl('/actuator/health'), ({ request }) => {
      urls.push(request.url);
      return HttpResponse.json(body, { status });
    }),
  );
  return { urls };
}

function renderHealth() {
  return renderApp(ROUTE_PATHS.team.health, { user: user() });
}

describe('HealthPage (S24)', () => {
  it('asks the actuator outside /api/v1, at the origin of the API base URL', async () => {
    const { urls } = serveHealth({ status: 'UP' });
    renderHealth();

    await screen.findByText(t('health.serviceUp'));
    expect(urls).toEqual([originUrl('/actuator/health')]);
    expect(urls[0]).not.toContain('/api/v1');
  });

  it('shows that the service is up, with the words and not only an icon', async () => {
    serveHealth({ status: 'UP' });
    renderHealth();

    expect(await screen.findByText(t('health.serviceUp'))).toBeVisible();
    expect(screen.queryByText(t('health.serviceDown'))).not.toBeInTheDocument();
  });

  it('lists the components the server publishes, each with its state in words', async () => {
    serveHealth({
      status: 'DOWN',
      components: { db: { status: 'UP' }, circuitBreaker: { status: 'OPEN' } },
    });
    renderHealth();

    expect(await screen.findByText(t('health.component.db'))).toBeVisible();
    expect(screen.getByText(t('health.component.circuitBreaker'))).toBeVisible();
    expect(screen.getByText(t('health.componentUp'))).toBeVisible();
    expect(screen.getByText(t('health.componentDown'))).toBeVisible();
  });

  it('says the server publishes no components when it sends none', async () => {
    serveHealth({ status: 'UP' });
    renderHealth();

    expect(await screen.findByText(t('health.componentsNone'))).toBeVisible();
  });

  it('shows the service as down when the actuator answers 503', async () => {
    serveHealth({ status: 'DOWN' }, SERVICE_UNAVAILABLE_STATUS);
    renderHealth();

    expect(await screen.findByText(t('health.serviceDown'))).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says the health cannot be read, and offers to refresh', async () => {
    server.use(
      http.get(originUrl('/actuator/health'), () =>
        errorResponse(INTERNAL_ERROR_STATUS, 'INTERNAL_ERROR'),
      ),
    );
    renderHealth();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(t('health.errorBody'))).toBeVisible();
  });

  it('asks again when the person presses Actualizar', async () => {
    const { urls } = serveHealth({ status: 'UP' });
    renderHealth();
    await screen.findByText(t('health.serviceUp'));

    await userEvent.click(screen.getByRole('button', { name: t('health.refresh') }));

    await waitFor(() => expect(urls).toHaveLength(TWO_CALLS));
  });

  it('shows the connection, the pending outbox and the version of the app', async () => {
    serveHealth({ status: 'UP' });
    renderHealth();
    await screen.findByText(t('health.serviceUp'));

    const device = screen.getByRole('region', { name: t('health.deviceTitle') });
    expect(within(device).getByText(t('health.online'))).toBeVisible();
    expect(within(device).getByText(t('health.nothingPending'))).toBeVisible();
    const app = screen.getByRole('region', { name: t('health.appTitle') });
    expect(
      within(app).getByText(t('health.appVersion', { version: packageJson.version })),
    ).toBeVisible();
  });
});
