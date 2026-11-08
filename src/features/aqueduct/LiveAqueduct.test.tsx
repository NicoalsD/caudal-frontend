import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { createLiveBackend } from '../../test/msw/liveBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const LONG_WAIT_MS = 15_000;
const TEST_TIMEOUT_MS = 30_000;
const ACTIVE_VALVES = 2;
const REASON = 'El sector Alto necesita agua para el turno.';
const FULL_PERMISSIONS = [
  'NETWORK_VIEW',
  'STATUS_VIEW',
  'READING_CREATE',
  'VALVE_COMMAND_MANUAL',
  'ASSISTANT_USE',
  'AUTOPILOT_CONFIGURE',
];
const OPERATOR = buildSessionUser({ role: 'OPERATOR', permissions: FULL_PERMISSIONS });
const VIEWER = buildSessionUser({
  role: 'OPERATOR',
  permissions: ['NETWORK_VIEW', 'STATUS_VIEW', 'ASSISTANT_USE'],
});
const HIGH_VALVE = 'Válvula alta';
const SCHOOL_VALVE = 'Válvula escuela';

function renderHome(user = OPERATOR, settings?: Parameters<typeof createLiveBackend>[0]) {
  const backend = createLiveBackend(settings);
  server.use(...backend.handlers);
  renderApp(ROUTE_PATHS.operator.home, { user });
  return backend;
}

async function openPanelIfFolded(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const handle = screen.queryByRole('button', { name: t('operatorHome.panelOpen') });
  if (handle !== null) {
    await user.click(handle);
  }
}

describe('Live aqueduct on the plumber home', () => {
  it('lists every active valve with its state, so the keyboard reaches what the scene draws', async () => {
    renderHome();

    const list = await screen.findByRole('list', { name: t('valves.listTitle') });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(ACTIVE_VALVES);
    expect(within(rows[0]!).getByText(SCHOOL_VALVE)).toBeVisible();
    expect(within(rows[0]!).getByText(t('valves.state.open'))).toBeVisible();
    expect(within(rows[1]!).getByText(t('valves.state.closed'))).toBeVisible();
    expect(screen.getByRole('region', { name: t('operatorHome.sceneRegion') })).toBeVisible();
  });

  it(
    'opens a valve with a reason and follows the command until the valve confirms',
    async () => {
      const backend = renderHome();
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole('button', { name: t('valves.openNamed', { valve: HIGH_VALVE }) }),
      );
      const dialog = await screen.findByRole('dialog', {
        name: t('valveControl.title', { valve: HIGH_VALVE }),
      });
      await user.type(await within(dialog).findByLabelText(t('valveControl.reasonLabel')), REASON);
      await user.click(within(dialog).getByRole('button', { name: t('valveControl.confirmOpen') }));

      await waitFor(() => expect(backend.state.commands).toHaveLength(1));
      expect(backend.state.commands[0]).toMatchObject({ command: 'OPEN', manual_reason: REASON });
      expect(await within(dialog).findByText(t('valveControl.stepSent'))).toBeVisible();
      expect(
        await within(dialog).findByText(t('valveControl.doneAcked'), {}, { timeout: LONG_WAIT_MS }),
      ).toBeVisible();
    },
    TEST_TIMEOUT_MS,
  );

  it(
    'says the valve did not answer when the command fails',
    async () => {
      const backend = renderHome();
      backend.state.failNextCommand = true;
      const user = userEvent.setup();

      await user.click(
        await screen.findByRole('button', { name: t('valves.openNamed', { valve: HIGH_VALVE }) }),
      );
      const dialog = await screen.findByRole('dialog');
      await user.type(await within(dialog).findByLabelText(t('valveControl.reasonLabel')), REASON);
      await user.click(within(dialog).getByRole('button', { name: t('valveControl.confirmOpen') }));

      expect(
        await within(dialog).findByText(
          t('valveControl.doneFailed'),
          {},
          { timeout: LONG_WAIT_MS },
        ),
      ).toBeVisible();
    },
    TEST_TIMEOUT_MS,
  );

  it('asks for a reason long enough before it sends anything', async () => {
    const backend = renderHome();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: t('valves.openNamed', { valve: HIGH_VALVE }) }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.type(await within(dialog).findByLabelText(t('valveControl.reasonLabel')), 'corto');
    await user.click(within(dialog).getByRole('button', { name: t('valveControl.confirmOpen') }));

    expect(
      await within(dialog).findByText(t('valveControl.reasonShort', { min: '10' })),
    ).toBeVisible();
    expect(backend.state.commands).toHaveLength(0);
  });

  it('only shows the valve to a person without permission to move it', async () => {
    renderHome(VIEWER);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: t('valves.lookNamed', { valve: HIGH_VALVE }) }),
    );

    expect(await screen.findByText(t('valveControl.noPermission'))).toBeVisible();
    expect(screen.queryByLabelText(t('valveControl.reasonLabel'))).not.toBeInTheDocument();
  });

  it('tells the plumber that a valve without motor is turned by hand', async () => {
    renderHome();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: t('valves.closeNamed', { valve: SCHOOL_VALVE }) }),
    );

    expect(await screen.findByText(t('valveControl.handValve'))).toBeVisible();
  });
});

describe('Autopilot mode and assistant panel', () => {
  it('takes control: puts the mode in MANUAL keeping the other settings', async () => {
    const backend = renderHome();
    const user = userEvent.setup();
    await openPanelIfFolded(user);

    await user.click(await screen.findByRole('button', { name: t('autopilot.takeControl') }));

    await waitFor(() => expect(backend.state.settingsPuts).toHaveLength(1));
    expect(backend.state.settingsPuts[0]).toMatchObject({
      mode: 'MANUAL',
      operator_absence_minutes: 30,
      reserve_floor_pct: 25,
    });
    expect(await screen.findByRole('button', { name: t('autopilot.giveBack') })).toBeVisible();
  });

  it('only shows the mode, without the button, to a person who cannot configure it', async () => {
    renderHome(VIEWER);

    expect(await screen.findByText(t('autopilot.readOnly'))).toBeVisible();
    expect(
      screen.queryByRole('button', { name: t('autopilot.takeControl') }),
    ).not.toBeInTheDocument();
  });

  it('accepts a pending recommendation', async () => {
    const backend = renderHome();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('assistant.accept') }));

    await waitFor(() => expect(backend.state.accepted).toHaveLength(1));
    expect(await screen.findByText(t('assistant.empty'))).toBeVisible();
  });

  it('rejects a pending recommendation', async () => {
    const backend = renderHome();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('assistant.reject') }));

    await waitFor(() => expect(backend.state.rejected).toHaveLength(1));
  });

  it('does not offer to accept when the person cannot move valves', async () => {
    renderHome(VIEWER);

    expect(await screen.findByText(t('assistant.cannotAccept'))).toBeVisible();
    expect(screen.queryByRole('button', { name: t('assistant.accept') })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('assistant.reject') })).toBeVisible();
  });

  it('answers a question and says which source wrote the answer', async () => {
    const backend = renderHome();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(t('assistant.askTitle')), '¿Alcanza el agua?');
    await user.click(screen.getByRole('button', { name: t('assistant.askSubmit') }));

    expect(await screen.findByText('El tanque alcanza para dos turnos más.')).toBeVisible();
    expect(
      screen.getByText(t('assistant.answerSource', { source: t('assistant.source.rules') })),
    ).toBeVisible();
    expect(backend.state.questions).toEqual(['¿Alcanza el agua?']);
  });
});
