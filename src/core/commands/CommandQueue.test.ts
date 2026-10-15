import { describe, expect, it } from 'vitest';

import { FakeClock } from '../../test/fakes/FakeClock';
import { InMemoryOutboxRepository } from './InMemoryOutboxRepository';
import { CommandQueue } from './CommandQueue';
import { SubmitReadingCommand } from './SubmitReadingCommand';
import type { SubmitReadingPayload } from './SubmitReadingCommand';
import type { OutboxOwner } from './OutboxRecord';

import type { BackoffPolicy } from '../policy/Backoff';

const NO_DELAY: BackoffPolicy = { delayFor: () => 0 };
const OWNER: OutboxOwner = { userId: 'u-1', aqueductId: 'a-1' };
const OTHER_OWNER: OutboxOwner = { userId: 'u-2', aqueductId: 'a-1' };
const CHANGES_AFTER_ENQUEUE_AND_SEND = 2;
const RETRY_STEP_MS = 1_000;
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
  return { repository, clock, queue: new CommandQueue(repository, clock, NO_DELAY) };
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

  it('tells the observers after each change, and not after they unsubscribe', async () => {
    const { queue } = setup();
    let changes = 0;
    const unsubscribe = queue.subscribe(() => {
      changes += 1;
    });
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.markSending('c-1');
    expect(changes).toBe(CHANGES_AFTER_ENQUEUE_AND_SEND);

    unsubscribe();
    await queue.settle('c-1', { type: 'SAVED' });
    expect(changes).toBe(CHANGES_AFTER_ENQUEUE_AND_SEND);
  });

  it('schedules a retry with the backoff of the attempt', async () => {
    const repository = new InMemoryOutboxRepository();
    const clock = new FakeClock(START_MS);
    const queue = new CommandQueue(repository, clock, {
      delayFor: (attempt) => attempt * RETRY_STEP_MS,
    });
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'RETRY', code: 'NETWORK' });

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ attempts: 1, nextAttemptAtMs: START_MS + RETRY_STEP_MS }),
    ]);
  });

  it('puts back an item the batch did not answer, without counting an attempt', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.markSending('c-1');
    await queue.settle('c-1', { type: 'UNANSWERED' });

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ status: 'PENDING', attempts: 0 }),
    ]);
  });
});

describe('CommandQueue corrections and session log', () => {
  it('keeps the range the server sent with a refusal', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', {
      type: 'REJECTED',
      code: 'GAUGE_OUT_OF_RANGE',
      details: { gauge_min: '0,00', gauge_max: '5,00' },
    });
    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({
        lastErrorDetails: { gauge_min: '0,00', gauge_max: '5,00' },
      }),
    ]);
  });

  it('replaces a refused item with a new one and removes the refused one', async () => {
    const { queue, repository } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'REJECTED', code: 'GAUGE_OUT_OF_RANGE' });

    const fixed = { ...PAYLOAD, gaugeValue: 2.5 };
    const record = await queue.replace(
      'c-1',
      new SubmitReadingCommand('c-2', fixed),
      OWNER,
      'rs-7',
    );

    expect(record).toMatchObject({
      clientId: 'c-2',
      status: 'PENDING',
      payload: fixed,
      ruleSetVersionId: 'rs-7',
      replacesClientId: 'c-1',
    });
    expect(await repository.get('c-1')).toBeNull();
    expect((await queue.pendingFor(OWNER)).map((item) => item.clientId)).toEqual(['c-2']);
  });

  it('drops a refused item with its reason and keeps the reason for the session', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'REJECTED', code: 'TOO_OLD' });

    await queue.discard('c-1', 'La lectura era de otro día.');

    expect(await queue.correctionsFor(OWNER)).toEqual([]);
    expect(queue.closedFor(OWNER)).toEqual([
      expect.objectContaining({
        clientId: 'c-1',
        outcome: 'DISCARDED',
        reason: 'La lectura era de otro día.',
      }),
    ]);
  });

  it('does nothing when discarding an unknown item', async () => {
    const { queue } = setup();
    await queue.discard('missing', 'Motivo de prueba.');
    expect(queue.closedFor(OWNER)).toEqual([]);
  });

  it('records a sent reading in the session log and leaves the queue', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.settle('c-1', { type: 'SAVED' });
    expect(queue.closedFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'c-1', outcome: 'SENT', payload: PAYLOAD }),
    ]);
    expect(queue.closedFor(OTHER_OWNER)).toEqual([]);
  });

  it('finds a stored item by its client id', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    expect(await queue.find('c-1')).toMatchObject({ clientId: 'c-1' });
    expect(await queue.find('missing')).toBeNull();
  });
});

describe('CommandQueue after a reload', () => {
  it('puts back an item that was being sent when the page closed', async () => {
    const { queue } = setup();
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);
    await queue.markSending('c-1');

    await queue.recoverInterrupted(OWNER);

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'c-1', status: 'PENDING' }),
    ]);
  });
});
