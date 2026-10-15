import { describe, expect, it } from 'vitest';

import { FakeClock } from '../../test/fakes/FakeClock';
import { InMemoryOutboxRepository } from './InMemoryOutboxRepository';
import { CommandQueue } from './CommandQueue';
import { SubmitReadingCommand } from './SubmitReadingCommand';
import type { SubmitReadingPayload } from './SubmitReadingCommand';
import type { OutboxOwner } from './OutboxRecord';

const OWNER: OutboxOwner = { userId: 'u-1', aqueductId: 'a-1' };
const OTHER_OWNER: OutboxOwner = { userId: 'u-2', aqueductId: 'a-1' };
const START_MS = Date.parse('2026-10-14T13:00:00Z');

const PAYLOAD: SubmitReadingPayload = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

function setup() {
  const repository = new InMemoryOutboxRepository();
  const clock = new FakeClock(START_MS);
  return { repository, clock, queue: new CommandQueue(repository, clock) };
}

describe('CommandQueue', () => {
  it('stores a pending record with the owner and the capture time', async () => {
    const { queue } = setup();
    const record = await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, 'rs-7');

    expect(record).toMatchObject({
      clientId: 'c-1',
      kind: 'SUBMIT_READING',
      status: 'PENDING',
      userId: 'u-1',
      aqueductId: 'a-1',
      ruleSetVersionId: 'rs-7',
      attempts: 0,
      createdAt: new Date(START_MS).toISOString(),
      payload: PAYLOAD,
    });
  });

  it('keeps one record when the same client id is enqueued twice', async () => {
    const { queue, repository } = setup();
    const command = new SubmitReadingCommand('c-1', PAYLOAD);
    await queue.enqueue(command, OWNER, null);
    await queue.enqueue(command, OWNER, null);

    expect(await repository.list(OWNER, ['PENDING'])).toHaveLength(1);
  });

  it('lists only the pending items of the owner', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.enqueue(new SubmitReadingCommand('c-2', PAYLOAD), OTHER_OWNER, null);

    expect((await queue.pendingFor(OWNER)).map((item) => item.clientId)).toEqual(['c-1']);
    expect(await queue.countPendingFor(OTHER_OWNER)).toBe(1);
  });

  it('removes an item the server saved', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'SAVED' });

    expect(await queue.pendingFor(OWNER)).toEqual([]);
  });

  it('moves a refused item to correction with the code and keeps it', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'REJECTED', code: 'GAUGE_OUT_OF_RANGE' });

    expect(await queue.pendingFor(OWNER)).toEqual([]);
    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({
        clientId: 'c-1',
        status: 'CORRECTION_PENDING',
        lastErrorCode: 'GAUGE_OUT_OF_RANGE',
        lastErrorAtMs: START_MS,
      }),
    ]);
  });

  it('counts a retry as an attempt and keeps the item pending', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.markSending('c-1');
    await queue.settle('c-1', { type: 'RETRY', code: 'NETWORK' });

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ status: 'PENDING', attempts: 1, lastErrorCode: 'NETWORK' }),
    ]);
  });

  it('ignores settle for an unknown client id', async () => {
    const { queue, repository } = setup();
    await queue.settle('missing', { type: 'SAVED' });
    await queue.settle('missing', { type: 'RETRY', code: 'NETWORK' });

    expect(await repository.get('missing')).toBeNull();
  });
});
