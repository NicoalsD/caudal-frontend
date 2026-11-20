import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import type { OutboxOwner } from '../../core/commands/OutboxRecord';
import type { Scheduler } from '../../core/time/Scheduler';
import { createAppServices } from '../../app/createAppServices';
import type { AppServices } from '../../app/createAppServices';
import { OfflineDatabase } from '../../services/offline/OfflineDatabase';
import { FakeClock } from '../fakes/FakeClock';
import { buildSessionUser } from '../factories/session';
import { SEED_TANKS } from '../factories/network';
import { createReadingsBackend } from '../msw/readingsBackend';
import type { BatchAnswerFor } from '../msw/readingsBackend';
import { server } from '../msw/server';

/** The phone's clock: a fixed instant, so every capture time in these tests is known. */
const NOW_MS = Date.parse('2026-10-14T13:00:00Z');
const ENV = { VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL };
const TANK_ID = SEED_TANKS[0]?.id ?? '';
const VALID_VALUE = 2.1;
const REFUSED_VALUE = 8;
const GAUGE_MAX = 5;
const FIRST_ID = 'c-1';
const SECOND_ID = 'c-2';

const ana = buildSessionUser({
  userId: '0190f3a2-0000-7000-8000-00000000000a',
  displayName: 'Ana',
  role: 'OPERATOR',
});
const luis = buildSessionUser({
  userId: '0190f3a2-0000-7000-8000-00000000000b',
  displayName: 'Luis',
  role: 'OPERATOR',
});
const ownerOf = (user: typeof ana): OutboxOwner => ({
  userId: user.userId,
  aqueductId: user.aqueductId,
});

/** The scheduler does not run timers: the tests call the sync themselves. */
const quietScheduler: Scheduler = { after: () => () => undefined };

function reading(gaugeValue: number): SubmitReadingPayload {
  return {
    tankId: TANK_ID,
    gaugeValue,
    waterAppearanceCode: 'NORMAL',
    damageNoticed: false,
    note: '',
    observedAt: '2026-10-14T08:00:00.000Z',
  };
}

/** One page load of the phone: a new set of services over the same IndexedDB. */
function openPage(user: typeof ana): AppServices {
  const services = createAppServices(ENV, new FakeClock(NOW_MS), quietScheduler);
  services.sessionStore.signIn(user);
  services.offline.syncQueue.setOwner(ownerOf(user));
  return services;
}

/** Simulates a reload: the memory is lost, the phone's database is not. */
function reloadPage(user: typeof ana): AppServices {
  OfflineDatabase.resetDefault();
  return openPage(user);
}

function goOffline(): void {
  window.dispatchEvent(new Event('offline'));
}

function goOnline(): void {
  window.dispatchEvent(new Event('online'));
}

async function emptyPhone(): Promise<void> {
  await OfflineDatabase.shared.outbox.clear();
}

describe('offline readings', () => {
  it('keeps a reading saved offline when the page reloads, and sends nothing while offline', async () => {
    await emptyPhone();
    const backend = createReadingsBackend();
    server.use(...backend.handlers);
    const first = openPage(ana);
    first.offline.connectivity.start();
    goOffline();

    await first.offline.outbox.enqueue(
      new SubmitReadingCommand(FIRST_ID, reading(VALID_VALUE)),
      ownerOf(ana),
      null,
    );
    const second = reloadPage(ana);

    await waitFor(async () => {
      expect(await second.offline.outbox.pendingFor(ownerOf(ana))).toEqual([
        expect.objectContaining({ clientId: FIRST_ID, status: 'PENDING' }),
      ]);
    });
    expect(second.offline.syncQueue.getSnapshot().pendingCount).toBe(1);
    expect(backend.batches).toEqual([]);
  });

  it('sends a reading that was being sent when the page closed, after the reload', async () => {
    await emptyPhone();
    const backend = createReadingsBackend();
    server.use(...backend.handlers);
    const first = openPage(ana);
    await first.offline.outbox.enqueue(
      new SubmitReadingCommand(FIRST_ID, reading(VALID_VALUE)),
      ownerOf(ana),
      null,
    );
    await first.offline.outbox.markSending(FIRST_ID);

    const second = reloadPage(ana);
    await second.offline.sync.flush({ ignoreBackoff: true });

    expect(backend.batches.flatMap((batch) => batch.readings.map((item) => item.id))).toEqual([
      FIRST_ID,
    ]);
    expect(await second.offline.outbox.pendingFor(ownerOf(ana))).toEqual([]);
  });

  it('keeps the reading when the send fails, and sends it when the connection comes back', async () => {
    await emptyPhone();
    const backend = createReadingsBackend();
    server.use(...backend.handlers);
    const services = openPage(ana);
    services.offline.connectivity.start();
    services.offline.syncTrigger.start();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand(FIRST_ID, reading(VALID_VALUE)),
      ownerOf(ana),
      null,
    );

    goOffline();
    backend.goDown();
    goOnline();
    await waitFor(async () => {
      expect(await services.offline.outbox.pendingFor(ownerOf(ana))).toEqual([
        expect.objectContaining({ clientId: FIRST_ID, status: 'PENDING', attempts: 1 }),
      ]);
    });

    backend.goUp();
    await services.offline.sync.flush({ ignoreBackoff: true });

    expect(await services.offline.outbox.pendingFor(ownerOf(ana))).toEqual([]);
    expect(services.offline.outbox.closedFor(ownerOf(ana))).toEqual([
      expect.objectContaining({ clientId: FIRST_ID, outcome: 'SENT' }),
    ]);
  });

  it('keeps the refused reading for correction when the rest of the batch is saved', async () => {
    await emptyPhone();
    const refuseHigh: BatchAnswerFor = (reading) =>
      reading.gauge_value > GAUGE_MAX
        ? {
            status: 'REJECTED',
            error: {
              code: 'GAUGE_OUT_OF_RANGE',
              details: { gauge_min: '0,00', gauge_max: '5,00', value: '8,00' },
            },
          }
        : { status: 'ACCEPTED' };
    const backend = createReadingsBackend(refuseHigh);
    server.use(...backend.handlers);
    const services = openPage(ana);
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand(FIRST_ID, reading(VALID_VALUE)),
      ownerOf(ana),
      null,
    );
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand(SECOND_ID, reading(REFUSED_VALUE)),
      ownerOf(ana),
      null,
    );

    await services.offline.sync.flush({ ignoreBackoff: true });

    await waitFor(() => {
      expect(services.offline.syncQueue.getSnapshot().needsReviewCount).toBe(1);
    });
    expect(services.offline.syncQueue.getSnapshot().pendingCount).toBe(0);
    expect(await services.offline.outbox.correctionsFor(ownerOf(ana))).toEqual([
      expect.objectContaining({
        clientId: SECOND_ID,
        status: 'CORRECTION_PENDING',
        lastErrorCode: 'GAUGE_OUT_OF_RANGE',
        lastErrorDetails: { gauge_min: '0,00', gauge_max: '5,00', value: '8,00' },
      }),
    ]);
    expect(services.offline.outbox.closedFor(ownerOf(ana)).map((item) => item.clientId)).toEqual([
      FIRST_ID,
    ]);
  });

  it('never shows or sends the readings of another person on the same phone', async () => {
    await emptyPhone();
    const backend = createReadingsBackend();
    server.use(...backend.handlers);
    const services = openPage(ana);
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand(FIRST_ID, reading(VALID_VALUE)),
      ownerOf(ana),
      null,
    );

    services.sessionStore.signIn(luis);
    services.offline.syncQueue.setOwner(ownerOf(luis));
    await services.offline.sync.flush({ ignoreBackoff: true });

    await waitFor(() => {
      expect(services.offline.syncQueue.getSnapshot().items).toEqual([]);
    });
    expect(backend.batches).toEqual([]);
    expect(await services.offline.outbox.pendingFor(ownerOf(ana))).toEqual([
      expect.objectContaining({ clientId: FIRST_ID }),
    ]);
  });
});
