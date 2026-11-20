import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import { t } from '../../i18n/t';
import { createAppServices } from '../../app/createAppServices';
import type { AppServices } from '../../app/createAppServices';
import { OfflineProvider } from '../../app/providers/OfflineProvider';
import { SessionProvider } from '../../app/providers/SessionProvider';
import { OfflineDatabase } from '../../services/offline/OfflineDatabase';
import { TEST_PASSWORD, TEST_USERS } from '../../test/factories/auth';
import { createSessionBackend } from '../../test/msw/sessionBackend';
import { server } from '../../test/msw/server';
import { SyncStatus } from '../sync';
import { SignOutButton } from './SignOutButton';

const ENV = { VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL };
const READING: SubmitReadingPayload = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

/** The signed-in operator, with the status (which reads the queue) and the sign-out button. */
async function renderSignedIn() {
  const backend = createSessionBackend(TEST_USERS.operator);
  server.use(...backend.handlers);
  const services = createAppServices(ENV);
  const user = await services.session.signIn({
    username: TEST_USERS.operator.username,
    password: TEST_PASSWORD,
  });
  render(
    <SessionProvider store={services.sessionStore} controller={services.session}>
      <OfflineProvider services={services.offline}>
        <SyncStatus />
        <SignOutButton />
      </OfflineProvider>
    </SessionProvider>,
  );
  return { backend, services, owner: { userId: user.userId, aqueductId: user.aqueductId } };
}

/** Queues one reading for the owner and waits until the status shows the new count. */
async function queueReading(
  services: AppServices,
  owner: { userId: string; aqueductId: string },
  count: number,
  clientId: string,
) {
  await services.offline.outbox.enqueue(new SubmitReadingCommand(clientId, READING), owner, null);
  await waitFor(() => {
    expect(services.offline.syncQueue.getSnapshot().pendingCount).toBe(count);
  });
}

describe('SignOutButton', () => {
  it('signs out straight away when nothing is waiting on this phone', async () => {
    const { backend, services } = await renderSignedIn();
    await waitFor(() => {
      expect(services.offline.syncQueue.getSnapshot().items).toEqual([]);
    });

    await userEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));

    await waitFor(() => {
      expect(backend.calls.logout).toBe(1);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks first when readings have not been sent, and keeps them when the person stays', async () => {
    const { backend, services, owner } = await renderSignedIn();
    const clientId = crypto.randomUUID();
    await queueReading(services, owner, 1, clientId);

    await userEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));
    const dialog = await screen.findByRole('dialog', { name: t('sync.signOutTitle') });
    expect(within(dialog).getByText(t('sync.signOutOneUnsent'))).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: t('sync.signOutStay') }));

    expect(backend.calls.logout).toBe(0);
    expect(await OfflineDatabase.shared.outbox.get(clientId)).toBeDefined();
  });

  it('signs out when the person confirms, and the readings stay on the phone', async () => {
    const { backend, services, owner } = await renderSignedIn();
    const clientId = crypto.randomUUID();
    await queueReading(services, owner, 1, clientId);

    await userEvent.click(screen.getByRole('button', { name: t('auth.signOut') }));
    const dialog = await screen.findByRole('dialog', { name: t('sync.signOutTitle') });
    await userEvent.click(within(dialog).getByRole('button', { name: t('sync.signOutConfirm') }));

    await waitFor(() => {
      expect(backend.calls.logout).toBe(1);
    });
    expect(await OfflineDatabase.shared.outbox.get(clientId)).toBeDefined();
  });
});
