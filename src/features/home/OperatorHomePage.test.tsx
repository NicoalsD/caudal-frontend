import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { FakeClock } from '../../test/fakes/FakeClock';
import { buildSessionUser } from '../../test/factories/session';
import { buildTankStatus } from '../../test/factories/status';
import { SEED_TANKS } from '../../test/factories/network';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TANK_ID = SEED_TANKS[0]?.id ?? '';
/** 14 Oct 2026, 15:00 in America/Bogota: the closure link must name this day. */
const NOW_MS = Date.parse('2026-10-14T20:00:00Z');
const OPERATOR = buildSessionUser({
  role: 'OPERATOR',
  displayName: 'Persona Fontanera',
  permissions: ['READING_CREATE'],
});
const PAYLOAD: SubmitReadingPayload = {
  tankId: TANK_ID,
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T13:00:00.000Z',
};

function renderHome() {
  return renderApp(ROUTE_PATHS.operator.home, {
    user: OPERATOR,
    clock: new FakeClock(NOW_MS),
  });
}

describe('OperatorHomePage (S07)', () => {
  it('greets the person by name and offers one main action to register a reading', async () => {
    renderHome();

    expect(
      await screen.findByText(t('home.greeting', { name: OPERATOR.displayName })),
    ).toBeVisible();
    const main = screen.getByRole('link', { name: t('home.newReading') });
    expect(main).toHaveAttribute('href', ROUTE_PATHS.operator.newReading);
    expect(main.className).toMatch(/primary/);
  });

  it('shows the last level, how old it is and where it goes', async () => {
    renderHome();

    expect(await screen.findByText(t('home.levelValue', { value: '2,3' }))).toBeVisible();
    expect(screen.getByText(t('home.levelAge', { hours: '6' }))).toBeVisible();
    expect(screen.getByText(t('tankStatus.trendDown'))).toBeVisible();
  });

  it('warns when the last level is too old', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json(buildTankStatus({ stale: { is_stale: true, stale_after_hours: 12 } })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('home.stale', { hours: '12' }))).toBeVisible();
  });

  it('says there is no level yet when the tank has no readings', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json(buildTankStatus({ level: null })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('tankStatus.noLevel'))).toBeVisible();
  });

  it('counts the readings that have not reached the server and links to them', async () => {
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    await services.offline.outbox.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), owner, null);
    await services.offline.outbox.enqueue(new SubmitReadingCommand('c-2', PAYLOAD), owner, null);

    const pending = await screen.findByRole('link', {
      name: t('home.pending', { count: '2' }),
    });
    expect(pending).toHaveAttribute('href', ROUTE_PATHS.operator.pending);
  });

  it('links to the closure of today in America/Bogota, and to the damage report', async () => {
    renderHome();

    const quick = await screen.findByRole('navigation', { name: t('home.quickLinks') });
    const closure = within(quick).getByRole('link', { name: t('home.dayClosure') });
    expect(closure).toHaveAttribute('href', '/operador/cierre/2026-10-14');
    expect(within(quick).getByRole('link', { name: t('home.damage') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.damage,
    );
  });

  it('marks the data as simulated on the demo aqueduct', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json(buildTankStatus({ is_demo: true })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('common.simulatedData'))).toBeVisible();
  });

  it('keeps the actions and tells the person when the level cannot be loaded', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
      ),
    );
    renderHome();

    expect(await screen.findByRole('alert')).toHaveTextContent(t('home.statusError'));
    expect(screen.getByRole('link', { name: t('home.newReading') })).toBeVisible();
  });

  it('lets the person sign out from the header', async () => {
    renderHome();

    const header = await screen.findByRole('banner');
    await waitFor(() => {
      expect(within(header).getByRole('button', { name: t('auth.signOut') })).toBeVisible();
    });
  });
});
