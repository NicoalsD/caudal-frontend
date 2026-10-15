import { describe, expect, it, vi } from 'vitest';

import { CommandQueue } from '../core/commands/CommandQueue';
import { InMemoryOutboxRepository } from '../core/commands/InMemoryOutboxRepository';
import type { OutboxOwner } from '../core/commands/OutboxRecord';
import { SubmitReadingCommand } from '../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import { FakeClock } from '../test/fakes/FakeClock';
import { SyncQueueStore } from './SyncQueueStore';

import type { BackoffPolicy } from '../core/policy/Backoff';

const NO_DELAY: BackoffPolicy = { delayFor: () => 0 };
const OWNER: OutboxOwner = { userId: 'u-1', aqueductId: 'a-1' };
const PAYLOAD: SubmitReadingPayload = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

function setup() {
  const queue = new CommandQueue(new InMemoryOutboxRepository(), new FakeClock(0), NO_DELAY);
  const store = new SyncQueueStore(queue);
  return { queue, store };
}

/** Waits until the store has published the expectation, without fixed delays. */
async function untilCount(store: SyncQueueStore, pending: number): Promise<void> {
  await vi.waitFor(() => {
    expect(store.getSnapshot().pendingCount).toBe(pending);
  });
}

describe('SyncQueueStore', () => {
  it('shows the pending count of the owner and updates with every change', async () => {
    const { queue, store } = setup();
    store.setOwner(OWNER);
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await untilCount(store, 1);

    await queue.settle('c-1', { type: 'SAVED' });
    await untilCount(store, 0);
  });

  it('notifies its subscribers when the counts change', async () => {
    const { queue, store } = setup();
    let notified = 0;
    store.subscribe(() => {
      notified += 1;
    });
    store.setOwner(OWNER);
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);

    await untilCount(store, 1);
    expect(notified).toBeGreaterThan(0);
  });

  it('shows the items that need review', async () => {
    const { queue, store } = setup();
    store.setOwner(OWNER);
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'REJECTED', code: 'GAUGE_OUT_OF_RANGE' });

    await vi.waitFor(() => {
      expect(store.getSnapshot().needsReviewCount).toBe(1);
    });
    expect(store.getSnapshot().pendingCount).toBe(0);
  });

  it('is empty when nobody is signed in', async () => {
    const { queue, store } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    store.setOwner(null);

    await vi.waitFor(() => {
      expect(store.getSnapshot().items).toEqual([]);
    });
  });
});
