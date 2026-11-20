import { http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE, TEST_AQUEDUCT_ID } from '../../test/factories/auth';
import { buildDeviceDto, DEVICE_ID, HOUR_MS } from '../../test/factories/devices';
import { SEED_TANKS } from '../../test/factories/network';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { createDevicesBackend } from '../../test/msw/devicesBackend';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const KEY_LENGTH = 43;
const SHORT_KEY_LENGTH = 20;
const PAGE_SIZE = 2;
const HOURS_SINCE_LAST_MESSAGE = 3;
const KEY = 'Q'.repeat(KEY_LENGTH);
const SHORT_KEY = 'Q'.repeat(SHORT_KEY_LENGTH);
const PAGES_READ = 2;
const VALVE_ID = '0190f3a2-0000-7000-8000-0000000000f1';
const VALVE_NAME = 'Válvula escuela';
const TANK_NAME = SEED_TANKS[0]?.name ?? '';
const FORBIDDEN_STATUS = 403;
const ONE_HOUR = 1;

const projectTeam = () =>
  buildSessionUser({
    role: 'PROJECT_TEAM',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.PROJECT_TEAM],
  });

const boardAdmin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    aqueductId: TEST_AQUEDUCT_ID,
    permissions: [...PERMISSIONS_BY_ROLE.BOARD_ADMIN],
  });

const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR_MS).toISOString();

/** Opens the register dialog and returns it, once the form is ready. */
async function openRegister(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: t('devices.register') }));
  const dialog = await screen.findByRole('dialog', { name: t('devices.registerTitle') });
  await within(dialog).findByLabelText(t('devices.nameLabel'));
  return dialog;
}

describe('DevicesPage (S25)', () => {
  it('shows the simulated-data banner and the empty state when nothing is registered', async () => {
    createDevicesBackendFor([]);
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });

    expect(await screen.findByText(t('devices.empty'))).toBeVisible();
    expect(screen.getByText(t('common.simulatedData'))).toBeVisible();
  });

  it('lists kind, name, status, last message, attached tank and key validity in plain words', async () => {
    createDevicesBackendFor([
      buildDeviceDto({
        name: 'Sensor del tanque principal',
        tank_id: SEED_TANKS[0]?.id ?? null,
        last_seen_at: hoursAgo(HOURS_SINCE_LAST_MESSAGE),
        active_key: {
          id: 'key-1',
          valid_from: '2026-10-09T14:05:00Z',
          valid_until: null,
        },
      }),
    ]);
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });

    const item = (
      await screen.findByRole('heading', { name: 'Sensor del tanque principal' })
    ).closest('li');
    expect(item).not.toBeNull();
    const row = within(item as HTMLElement);
    expect(
      row.getByText(t('devices.kindLine', { kind: t('devices.kinds.levelSensor') })),
    ).toBeVisible();
    expect(row.getByText(t('devices.statuses.active'))).toBeVisible();
    expect(
      row.getByText(t('devices.lastSeen', { hours: String(HOURS_SINCE_LAST_MESSAGE) })),
    ).toBeVisible();
    expect(row.getByText(t('devices.attachedTank', { name: TANK_NAME }))).toBeVisible();
    expect(row.getByText(/^Clave vigente desde .+, sin vencimiento$/)).toBeVisible();
  });

  it('shows Nunca and no key for a device that has never reported', async () => {
    createDevicesBackendFor([
      buildDeviceDto({ name: 'Motor nuevo', kind: 'VALVE_ACTUATOR', valve_id: VALVE_ID }),
    ]);
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });

    const item = (await screen.findByRole('heading', { name: 'Motor nuevo' })).closest('li');
    const row = within(item as HTMLElement);
    expect(row.getByText(t('devices.lastSeenNever'))).toBeVisible();
    expect(row.getByText(t('devices.noKey'))).toBeVisible();
    expect(row.getByText(t('devices.attachedValve', { name: VALVE_NAME }))).toBeVisible();
  });

  it('reads the list one page at a time with "Ver más"', async () => {
    const backend = createDevicesBackendFor(
      ['Uno', 'Dos', 'Tres'].map((name, index) => buildDeviceDto({ id: `d-${index}`, name })),
      PAGE_SIZE,
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });

    expect(await screen.findByRole('heading', { name: 'Uno' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Tres' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t('devices.loadMore') }));

    expect(await screen.findByRole('heading', { name: 'Tres' })).toBeVisible();
    expect(screen.queryByRole('button', { name: t('devices.loadMore') })).not.toBeInTheDocument();
    expect(backend.requests.filter((request) => request.path === '/devices')).toHaveLength(
      PAGES_READ,
    );
  });

  it('registers a valve motor: the device first, then its key, and clears the key', async () => {
    const backend = createDevicesBackendFor([]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    const dialog = await openRegister(user);

    await user.click(within(dialog).getByRole('radio', { name: t('devices.kinds.valveActuator') }));
    await user.type(within(dialog).getByLabelText(t('devices.nameLabel')), 'Motor del puente');
    await user.selectOptions(within(dialog).getByLabelText(t('devices.valveLabel')), VALVE_ID);
    await user.type(within(dialog).getByLabelText(t('devices.publicKeyLabel')), KEY);
    await user.click(within(dialog).getByRole('button', { name: t('devices.submitRegister') }));

    expect(await screen.findByText(t('devices.registered'))).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const posts = backend.requests.filter((request) => request.method === 'POST');
    expect(posts).toEqual([
      {
        method: 'POST',
        path: '/devices',
        body: { kind: 'VALVE_ACTUATOR', name: 'Motor del puente', valve_id: VALVE_ID },
      },
      { method: 'POST', path: '/devices/device-1/keys', body: { public_key: KEY } },
    ]);
    expect(document.body.textContent).not.toContain(KEY);
  });

  it('asks for a tank when the device is a level sensor', async () => {
    const backend = createDevicesBackendFor([]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    const dialog = await openRegister(user);

    await user.click(within(dialog).getByRole('radio', { name: t('devices.kinds.levelSensor') }));
    await user.type(within(dialog).getByLabelText(t('devices.nameLabel')), 'Sensor nuevo');
    await user.type(within(dialog).getByLabelText(t('devices.publicKeyLabel')), KEY);
    await user.click(within(dialog).getByRole('button', { name: t('devices.submitRegister') }));

    expect(await within(dialog).findByText(t('devices.tankRequired'))).toBeVisible();
    expect(backend.requests.some((request) => request.method === 'POST')).toBe(false);
  });

  it('rejects a key that does not have the shape of a public key, without sending it', async () => {
    const backend = createDevicesBackendFor([]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    const dialog = await openRegister(user);

    await user.click(within(dialog).getByRole('radio', { name: t('devices.kinds.gateway') }));
    await user.type(within(dialog).getByLabelText(t('devices.nameLabel')), 'Puerta del cerro');
    await user.type(within(dialog).getByLabelText(t('devices.publicKeyLabel')), SHORT_KEY);
    await user.click(within(dialog).getByRole('button', { name: t('devices.submitRegister') }));

    expect(await within(dialog).findByText(t('devices.publicKeyInvalid'))).toBeVisible();
    expect(backend.requests.some((request) => request.method === 'POST')).toBe(false);
  });

  it('says the device exists when its key could not be stored', async () => {
    createDevicesBackendFor([]);
    server.use(
      http.post(apiUrl('/devices/:id/keys'), () => errorResponse(FORBIDDEN_STATUS, 'FORBIDDEN')),
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    const dialog = await openRegister(user);

    await user.click(within(dialog).getByRole('radio', { name: t('devices.kinds.gateway') }));
    await user.type(within(dialog).getByLabelText(t('devices.nameLabel')), 'Puerta del cerro');
    await user.type(within(dialog).getByLabelText(t('devices.publicKeyLabel')), KEY);
    await user.click(within(dialog).getByRole('button', { name: t('devices.submitRegister') }));

    expect(await screen.findByText(t('devices.keyFailed'))).toBeVisible();
    expect(document.body.textContent).not.toContain(KEY);
  });

  it('suspends a device only after the person confirms', async () => {
    const backend = createDevicesBackendFor([
      buildDeviceDto({ name: 'Sensor del tanque principal', last_seen_at: hoursAgo(ONE_HOUR) }),
    ]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    await user.click(await screen.findByRole('button', { name: t('devices.suspend') }));
    const dialog = await screen.findByRole('dialog', {
      name: t('devices.confirmSuspendTitle', { name: 'Sensor del tanque principal' }),
    });

    expect(within(dialog).getByRole('button', { name: t('common.cancel') })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: t('common.cancel') }));
    expect(backend.requests.some((request) => request.method === 'PATCH')).toBe(false);

    await user.click(screen.getByRole('button', { name: t('devices.suspend') }));
    await user.click(await screen.findByRole('button', { name: t('devices.confirmSuspend') }));

    await waitFor(() => {
      expect(screen.getByText(t('devices.statuses.suspended'))).toBeVisible();
    });
    expect(backend.requests.filter((request) => request.method === 'PATCH')).toEqual([
      { method: 'PATCH', path: `/devices/${DEVICE_ID}`, body: { status: 'SUSPENDED' } },
    ]);
  });

  it('reactivates a suspended device without asking, and retires one after confirming', async () => {
    const backend = createDevicesBackendFor([buildDeviceDto({ status: 'SUSPENDED' })]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    await user.click(await screen.findByRole('button', { name: t('devices.activate') }));

    expect(await screen.findByText(t('devices.statuses.active'))).toBeVisible();
    await user.click(screen.getByRole('button', { name: t('devices.retire') }));
    await user.click(await screen.findByRole('button', { name: t('devices.confirmRetire') }));

    expect(await screen.findByText(t('devices.statuses.retired'))).toBeVisible();
    expect(backend.requests.filter((request) => request.method === 'PATCH')).toEqual([
      { method: 'PATCH', path: `/devices/${DEVICE_ID}`, body: { status: 'ACTIVE' } },
      { method: 'PATCH', path: `/devices/${DEVICE_ID}`, body: { status: 'RETIRED' } },
    ]);
    expect(screen.queryByRole('button', { name: t('devices.rotateKey') })).not.toBeInTheDocument();
  });

  it('rotates the key and never renders the key text', async () => {
    const backend = createDevicesBackendFor([
      buildDeviceDto({ name: 'Sensor del tanque principal' }),
    ]);
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    await user.click(await screen.findByRole('button', { name: t('devices.rotateKey') }));
    const dialog = await screen.findByRole('dialog', { name: t('devices.rotateTitle') });

    await user.type(within(dialog).getByLabelText(t('devices.publicKeyLabel')), KEY);
    await user.click(within(dialog).getByRole('button', { name: t('devices.submitRotate') }));

    expect(await screen.findByText(t('devices.keyRegistered'))).toBeVisible();
    expect(backend.requests).toContainEqual({
      method: 'POST',
      path: `/devices/${DEVICE_ID}/keys`,
      body: { public_key: KEY },
    });
    expect(document.body.textContent).not.toContain(KEY);
  });

  it('shows the board administrator the same screen', async () => {
    createDevicesBackendFor([buildDeviceDto({ name: 'Sensor del tanque principal' })]);
    renderApp(ROUTE_PATHS.team.devices, { user: boardAdmin() });

    expect(
      await screen.findByRole('heading', { name: 'Sensor del tanque principal' }),
    ).toBeVisible();
  });

  it('sends a role without DEVICE_MANAGE to the forbidden page and asks the server nothing', async () => {
    const backend = createDevicesBackendFor([buildDeviceDto()]);
    renderApp(ROUTE_PATHS.team.devices, {
      user: buildSessionUser({ role: 'OPERATOR', aqueductId: TEST_AQUEDUCT_ID }),
    });

    expect(await screen.findByText(t('errors.forbiddenTitle'))).toBeVisible();
    expect(backend.requests).toHaveLength(0);
  });

  it('shows the server refusal as an error with a retry', async () => {
    server.use(http.get(apiUrl('/devices'), () => errorResponse(FORBIDDEN_STATUS, 'FORBIDDEN')));
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });

    expect(await screen.findByText(t('errors.api.forbidden'))).toBeVisible();
    expect(screen.getByRole('button', { name: t('common.retry') })).toBeVisible();
  });

  it('keeps the list readable offline and disables every change', async () => {
    createDevicesBackendFor([buildDeviceDto({ name: 'Sensor del tanque principal' })]);
    renderApp(ROUTE_PATHS.team.devices, { user: projectTeam() });
    expect(
      await screen.findByRole('heading', { name: 'Sensor del tanque principal' }),
    ).toBeVisible();

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    try {
      expect(await screen.findByText(t('devices.offlineReadOnly'))).toBeVisible();
      expect(screen.getByRole('button', { name: t('devices.register') })).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: t('devices.rotateKey') }),
      ).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });
});

/** Installs the devices fake for this test and returns it. */
function createDevicesBackendFor(devices: ReturnType<typeof buildDeviceDto>[], pageSize?: number) {
  const backend = createDevicesBackend({
    devices,
    ...(pageSize === undefined ? {} : { pageSize }),
  });
  server.use(...backend.handlers);
  return backend;
}
