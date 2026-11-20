import { delay, http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import { formatTime } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { FakeClock } from '../../test/fakes/FakeClock';
import { buildSessionUser } from '../../test/factories/session';
import { buildTankStatus } from '../../test/factories/status';
import { SEED_SECTORS_LIST, SEED_TANKS } from '../../test/factories/network';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TANK_ID = SEED_TANKS[0]?.id ?? '';
/** 14 Oct 2026, 15:00 in America/Bogota: "today" for the home is this day. */
const NOW_MS = Date.parse('2026-10-14T20:00:00Z');
const TODAY = '2026-10-14';
/** Long enough for the retries of a server error (RetryPolicy) to end. */
const ERROR_TIMEOUT_MS = 10_000;
const SHIFT_COUNT = 2;
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

    expect(
      await screen.findByText(t('console.levelLine', { level: '2,3', hours: '26' }), {
        exact: false,
      }),
    ).toBeVisible();
    const main = screen.getByRole('link', { name: t('home.newReading') });
    expect(main).toHaveAttribute('href', ROUTE_PATHS.operator.newReading);
    expect(main.className).toMatch(/primary/);
  });

  it('offers to close the day once today has a reading', async () => {
    renderHome();

    const main = await screen.findByRole('link', { name: t('home.closeDay') });
    expect(main).toHaveAttribute('href', `/operador/cierre/${TODAY}`);
    expect(main.className).toMatch(/primary/);
  });

  it('shows the level big, how old it is, and a link to the forecast', async () => {
    renderHome();

    const summary = await screen.findByRole('region', { name: 'Tanque principal' });
    expect(
      await within(summary).findByText(t('console.levelLine', { level: '2,3', hours: '6' }), {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      await within(summary).findByRole('link', { name: t('console.forecastOpen') }),
    ).toHaveAttribute('href', ROUTE_PATHS.tank);
  });

  it('warns when the last level is too old', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json(buildTankStatus({ stale: { is_stale: true, stale_after_hours: 12 } })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('console.staleLong'))).toBeVisible();
  });

  it('says there is no level yet when the tank has no readings', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json(buildTankStatus({ level: null, band: null, trend: null })),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('console.levelNone'))).toBeVisible();
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

  it('links to the closure of today beside the shifts and to the damage report', async () => {
    renderHome();

    expect(await screen.findByRole('link', { name: t('home.dayClosure') })).toHaveAttribute(
      'href',
      `/operador/cierre/${TODAY}`,
    );
    expect(
      screen
        .getAllByRole('link', { name: t('home.damage') })
        .map((link) => link.getAttribute('href')),
    ).toContain(ROUTE_PATHS.operator.damage);
  });

  it('keeps the main action when the level cannot be loaded', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
      ),
    );
    renderHome();

    // The HTTP layer retries a server error with a backoff; the action never waits for it.
    expect(
      await screen.findByRole(
        'link',
        { name: t('home.newReading') },
        { timeout: ERROR_TIMEOUT_MS },
      ),
    ).toBeVisible();
    expect(screen.getAllByRole('link', { name: t('home.damage') })[0]).toBeVisible();
  });

  it('keeps the pending readings and the main action while the level is still loading', async () => {
    server.use(
      http.get(apiUrl(`/tanks/${TANK_ID}/status`), async () => {
        await delay('infinite');
        return HttpResponse.json(buildTankStatus());
      }),
    );
    // The phone holds yesterday's reading: today still needs its reading, whatever the level says.
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-slow', { ...PAYLOAD, observedAt: YESTERDAY_READING_UTC }),
      owner,
      null,
    );

    expect(await screen.findByRole('link', { name: t('home.seePending') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.pending,
    );
    expect(screen.getByRole('link', { name: t('home.newReading') })).toBeVisible();
  });

  it('keeps the main action and the pending readings when the tanks cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/tanks'), () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'x' } }, { status: 500 }),
      ),
    );
    const { services } = renderHome();
    const owner = { userId: OPERATOR.userId, aqueductId: OPERATOR.aqueductId };
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-no-tank', { ...PAYLOAD, observedAt: YESTERDAY_READING_UTC }),
      owner,
      null,
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

  it('shows the day in words as the only heading of the screen', async () => {
    renderHome();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: t('home.todayHeading', { date: 'miércoles 14 de octubre' }),
      }),
    ).toBeVisible();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the published shifts of today in sequence order, with sector names and times', async () => {
    const [firstSector, secondSector] = SEED_SECTORS_LIST;
    server.use(
      http.get(apiUrl(`/days/${TODAY}/schedule`), () =>
        HttpResponse.json({
          service_date: TODAY,
          proposal_id: '0190f3a2-0000-7000-8000-0000000000f1',
          published_at: '2026-10-13T18:00:00-05:00',
          items: [
            {
              id: 'item-late',
              sector_id: secondSector?.id ?? '',
              sequence: 2,
              start_at: `${TODAY}T14:00:00-05:00`,
              end_at: `${TODAY}T22:00:00-05:00`,
            },
            {
              id: 'item-early',
              sector_id: firstSector?.id ?? '',
              sequence: 1,
              start_at: `${TODAY}T06:00:00-05:00`,
              end_at: `${TODAY}T14:00:00-05:00`,
            },
          ],
        }),
      ),
    );
    renderHome();

    const list = await screen.findByRole('list', { name: t('home.shiftsTitle') });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(within(list).getAllByRole('listitem')).toHaveLength(SHIFT_COUNT);
    expect(first).toHaveTextContent(firstSector?.name ?? '');
    expect(first).toHaveTextContent(formatTime(`${TODAY}T06:00:00-05:00`));
    expect(second).toHaveTextContent(secondSector?.name ?? '');
    expect(second).toHaveTextContent(formatTime(`${TODAY}T14:00:00-05:00`));
  });

  it('says there are no shifts published for today when the day has no schedule', async () => {
    server.use(
      http.get(apiUrl(`/days/${TODAY}/schedule`), () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 }),
      ),
    );
    renderHome();

    expect(await screen.findByText(t('home.shiftsEmpty'))).toBeVisible();
    expect(screen.queryByRole('list', { name: t('home.shiftsTitle') })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: t('home.damage') })[0]).toBeVisible();
  });

  it('lets the person sign out from the header', async () => {
    renderHome();

    const header = await screen.findByRole('banner');
    await userEvent.click(await within(header).findByRole('button', { name: /^Menú de / }));
    expect(within(header).getByRole('button', { name: t('auth.signOut') })).toBeVisible();
  });
});
