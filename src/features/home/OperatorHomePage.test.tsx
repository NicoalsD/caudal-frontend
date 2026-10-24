import { delay, http, HttpResponse } from 'msw';
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
/** 14 Oct 2026, 15:00 in America/Bogota: "today" for the home is this day. */
const NOW_MS = Date.parse('2026-10-14T20:00:00Z');
const TODAY = '2026-10-14';
/** Long enough for the retries of a server error (RetryPolicy) to end. */
const ERROR_TIMEOUT_MS = 10_000;
const YESTERDAY_READING = '2026-10-13T12:15:00-05:00';
const YESTERDAY_READING_UTC = '2026-10-13T13:00:00.000Z';
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

/** The day is still open: the closure of today answers 404 (null in the client). */
function dayIsOpen() {
  server.use(
    http.get(apiUrl(`/days/${TODAY}/closure`), () =>
      HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 }),
    ),
  );
}

function renderHome() {
  dayIsOpen();
  return renderApp(ROUTE_PATHS.operator.home, {
    user: OPERATOR,
    clock: new FakeClock(NOW_MS),
  });
}

/** A level taken yesterday: today has no reading yet. */
function levelFromYesterday() {
  server.use(
    http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
      HttpResponse.json(
        buildTankStatus({
          level: { value: 2.3, observed_at: YESTERDAY_READING, hours_ago: 26 },
        }),
      ),
    ),
  );
}

describe('OperatorHomePage (S07)', () => {
  it('greets the person by name', async () => {
    renderHome();

    expect(
      await screen.findByText(t('home.greeting', { name: OPERATOR.displayName })),
    ).toBeVisible();
  });

  it('asks for the reading first when today has none', async () => {
    levelFromYesterday();
    renderHome();

    expect(await screen.findByText(t('home.levelValue', { value: '2,3' }))).toBeVisible();
    const main = screen.getByRole('link', { name: t('home.newReading') });
    expect(main).toHaveAttribute('href', ROUTE_PATHS.operator.newReading);
    expect(main.className).toMatch(/primary/);
    expect(screen.getByText(t('home.todayReadingMissing'))).toBeVisible();
  });

  it('offers to close the day once today has a reading', async () => {
    renderHome();

    const main = await screen.findByRole('link', { name: t('home.closeDay') });
    expect(main).toHaveAttribute('href', `/operador/cierre/${TODAY}`);
    expect(main.className).toMatch(/primary/);
    expect(screen.getByText(t('home.todayReadingDone'))).toBeVisible();
  });

  it('shows the last level big, how old it is, and a link to the tank status', async () => {
    renderHome();

    expect(await screen.findByText(t('home.levelValue', { value: '2,3' }))).toBeVisible();
    expect(screen.getByText(t('home.levelAge', { hours: '6' }))).toBeVisible();
    expect(screen.getByRole('link', { name: t('home.tankDetail') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.tank,
    );
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
        HttpResponse.json(buildTankStatus({ level: null, band: null, trend: null })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('tankStatus.noLevel'))).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('counts the readings that have not reached the server and links to them', async () => {
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    // Yesterday's readings: the phone keeps its queue between tests, so today's must stay free.
    const older: SubmitReadingPayload = { ...PAYLOAD, observedAt: YESTERDAY_READING_UTC };
    await services.offline.outbox.enqueue(new SubmitReadingCommand('c-1', older), owner, null);
    await services.offline.outbox.enqueue(new SubmitReadingCommand('c-2', older), owner, null);

    expect(await screen.findByText(t('home.todayPending', { count: '2' }))).toBeVisible();
    expect(screen.getByRole('link', { name: t('home.seePending') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.pending,
    );
  });

  it('shows the closure of today in the checklist and links to the damage report', async () => {
    renderHome();

    const checklist = await screen.findByRole('region', { name: t('home.todayTitle') });
    expect(within(checklist).getByText(t('home.todayClosureHint'))).toBeVisible();
    expect(within(checklist).getByRole('link', { name: t('home.dayClosure') })).toHaveAttribute(
      'href',
      `/operador/cierre/${TODAY}`,
    );
    expect(
      screen
        .getAllByRole('link', { name: t('home.damage') })
        .map((link) => link.getAttribute('href')),
    ).toContain(ROUTE_PATHS.operator.damage);
  });

  it('keeps the actions and tells the person when the level cannot be loaded', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
      ),
    );
    renderHome();

    // The HTTP layer retries a server error with a backoff before the screen shows it.
    expect(await screen.findByRole('alert', {}, { timeout: ERROR_TIMEOUT_MS })).toHaveTextContent(
      t('home.statusError'),
    );
    expect(screen.getByRole('link', { name: t('home.newReading') })).toBeVisible();
  });

  it('keeps the pending readings and the main action while the level is still loading', async () => {
    // The phone holds yesterday's reading: today still needs its reading, whatever the level says.
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-slow', { ...PAYLOAD, observedAt: YESTERDAY_READING_UTC }),
      owner,
      null,
    );
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), async () => {
        await delay('infinite');
        return HttpResponse.json(buildTankStatus());
      }),
    );

    expect(await screen.findByRole('link', { name: t('home.seePending') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.pending,
    );
    expect(screen.getByRole('link', { name: t('home.newReading') })).toBeVisible();
  });

  it('keeps the main action and the pending readings when the tanks cannot be loaded', async () => {
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-no-tank', { ...PAYLOAD, observedAt: YESTERDAY_READING_UTC }),
      owner,
      null,
    );
    server.use(
      http.get(apiUrl('/tanks'), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
      ),
    );

    expect(
      await screen.findByRole(
        'link',
        { name: t('home.newReading') },
        { timeout: ERROR_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: t('home.seePending') })).toBeVisible();
  });

  it('lets the person sign out from the header', async () => {
    renderHome();

    const header = await screen.findByRole('banner');
    await waitFor(() => {
      expect(within(header).getByRole('button', { name: t('auth.signOut') })).toBeVisible();
    });
  });
});
