import { describe, expect, it } from 'vitest';

import { CommandQueue } from '../core/commands/CommandQueue';
import { InMemoryOutboxRepository } from '../core/commands/InMemoryOutboxRepository';
import type { OutboxOwner, OutboxRecord } from '../core/commands/OutboxRecord';
import { SubmitReadingCommand } from '../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import { DomainError } from '../core/errors/DomainError';
import { NetworkError } from '../core/errors/NetworkError';
import type { BackoffPolicy } from '../core/policy/Backoff';
import { OUTBOX_BATCH_SIZE } from '../core/policy/clientPolicy';
import type { ReadingBatchInput, ReadingBatchResultView } from '../services/api/views';
import { FakeClock } from '../test/fakes/FakeClock';
import { OutboxSync } from './OutboxSync';
import type { ReadingBatchSubmitter } from './OutboxSync';

const OWNER: OutboxOwner = { userId: 'u-1', aqueductId: 'a-1' };
const PAYLOAD: SubmitReadingPayload = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};
const NO_DELAY: BackoffPolicy = { delayFor: () => 0 };
const RETRY_DELAY_MS = 5_000;
const FIRST_ATTEMPT = 1;
const BATCHES_AFTER_RECONNECT = 2;
const START_MS = 1_000;

/** Answers every item as saved, unless the test gives its own answer. */
function savedAnswer(batch: ReadingBatchInput): ReadingBatchResultView {
  return {
    syncBatchId: batch.syncBatchId,
    idempotentReplay: false,
    answers: batch.readings.map((reading) => ({
      id: reading.id,
      status: 'ACCEPTED',
      errorCode: null,
    })),
  };
}

function setup(
  submitBatch: ReadingBatchSubmitter['submitBatch'],
  owner: OutboxOwner | null = OWNER,
) {
  const repository = new InMemoryOutboxRepository();
  const clock = new FakeClock(START_MS);
  const queue = new CommandQueue(repository, clock, NO_DELAY);
  const batches: ReadingBatchInput[] = [];
  let nextId = 0;
  const sync = new OutboxSync(
    queue,
    {
      submitBatch: (input) => {
        batches.push(input);
        return submitBatch(input);
      },
    },
    { nextId: () => `batch-${(nextId += 1)}` },
    clock,
    () => owner,
  );
  return { queue, sync, batches, repository, clock };
}

async function enqueue(queue: CommandQueue, clientId: string, owner = OWNER): Promise<void> {
  await queue.enqueue(new SubmitReadingCommand(clientId, PAYLOAD), owner, null);
}

describe('OutboxSync', () => {
  it('sends the owner readings in one batch with a fresh batch id and removes them when saved', async () => {
    const { queue, sync, batches } = setup((batch) => Promise.resolve(savedAnswer(batch)));
    await enqueue(queue, 'c-1');
    await enqueue(queue, 'c-2');

    await sync.flush();

    expect(batches).toEqual([
      expect.objectContaining({
        syncBatchId: 'batch-1',
        readings: [
          expect.objectContaining({ id: 'c-1', tankId: 't-1', gaugeValue: 2.1 }),
          expect.objectContaining({ id: 'c-2' }),
        ],
      }),
    ]);
    expect(await queue.pendingFor(OWNER)).toEqual([]);
  });

  it('splits a long queue into batches of the policy size', async () => {
    const { queue, sync, batches } = setup((batch) => Promise.resolve(savedAnswer(batch)));
    for (let index = 0; index <= OUTBOX_BATCH_SIZE; index += 1) {
      await enqueue(queue, `c-${index}`);
    }

    await sync.flush();

    expect(batches.map((batch) => batch.readings.length)).toEqual([OUTBOX_BATCH_SIZE, 1]);
  });

  it('keeps a reading the server refused for correction and does not send it again', async () => {
    const { queue, sync, batches } = setup((batch) =>
      Promise.resolve({
        ...savedAnswer(batch),
        answers: [{ id: 'c-1', status: 'REJECTED', errorCode: 'GAUGE_OUT_OF_RANGE' }],
      }),
    );
    await enqueue(queue, 'c-1');

    await sync.flush();
    await sync.flush({ ignoreBackoff: true });

    expect(batches).toHaveLength(1);
    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'c-1', lastErrorCode: 'GAUGE_OUT_OF_RANGE' }),
    ]);
  });

  it('keeps a reading pending when there is no connection, counting the attempt', async () => {
    const { queue, sync } = setup(() => Promise.reject(new NetworkError()));
    await enqueue(queue, 'c-1');

    await sync.flush();

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ status: 'PENDING', attempts: FIRST_ATTEMPT }),
    ]);
  });

  it('keeps items waiting for their backoff until it is due, unless the connection is back', async () => {
    const repository = new InMemoryOutboxRepository();
    const clock = new FakeClock(START_MS);
    const queue = new CommandQueue(repository, clock, { delayFor: () => RETRY_DELAY_MS });
    const batches: ReadingBatchInput[] = [];
    const sync = new OutboxSync(
      queue,
      {
        submitBatch: (input) => {
          batches.push(input);
          return Promise.reject(new NetworkError());
        },
      },
      { nextId: () => 'batch' },
      clock,
      () => OWNER,
    );
    await enqueue(queue, 'c-1');
    await sync.flush();

    await sync.flush();
    expect(batches).toHaveLength(1);

    await sync.flush({ ignoreBackoff: true });
    expect(batches).toHaveLength(BATCHES_AFTER_RECONNECT);
  });

  it('marks a batch the server refuses as a whole for correction', async () => {
    const { queue, sync } = setup(() => Promise.reject(new DomainError('VALIDATION_ERROR', 'x')));
    await enqueue(queue, 'c-1');

    await sync.flush();

    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({ lastErrorCode: 'VALIDATION_ERROR' }),
    ]);
  });

  it('sends again with a new batch id when the server reports the batch id as reused', async () => {
    let calls = 0;
    const { queue, sync, batches } = setup((batch) => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(new DomainError('CONFLICT', 'reused'));
      }
      return Promise.resolve(savedAnswer(batch));
    });
    await enqueue(queue, 'c-1');

    await sync.flush();

    expect(batches.map((batch) => batch.syncBatchId)).toEqual(['batch-1', 'batch-2']);
    expect(await queue.pendingFor(OWNER)).toEqual([]);
  });

  it('keeps an item the answer does not mention for the next flush, without an attempt', async () => {
    const { queue, sync } = setup(() =>
      Promise.resolve({
        syncBatchId: 'batch-1',
        idempotentReplay: false,
        answers: [],
      }),
    );
    await enqueue(queue, 'c-1');

    await sync.flush();

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ status: 'PENDING', attempts: 0 }),
    ]);
  });

  it('marks a stored record that is not a reading for correction without sending it', async () => {
    const { queue, sync, batches, repository } = setup((batch) =>
      Promise.resolve(savedAnswer(batch)),
    );
    const broken: OutboxRecord = {
      clientId: 'bad',
      kind: 'SUBMIT_READING',
      status: 'PENDING',
      userId: OWNER.userId,
      aqueductId: OWNER.aqueductId,
      payload: { tankId: 42 },
      createdAt: '2026-10-14T08:00:00.000Z',
      ruleSetVersionId: null,
      attempts: 0,
      nextAttemptAtMs: null,
      lastErrorCode: null,
      lastErrorAtMs: null,
    };
    await repository.put(broken);

    await sync.flush();

    expect(batches).toEqual([]);
    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'bad', lastErrorCode: 'LOCAL_CORRUPT' }),
    ]);
  });

  it('never sends the readings of another owner', async () => {
    const { queue, sync, batches } = setup((batch) => Promise.resolve(savedAnswer(batch)));
    await enqueue(queue, 'c-2', { userId: 'u-2', aqueductId: 'a-1' });

    await sync.flush();

    expect(batches).toEqual([]);
  });

  it('does nothing when nobody is signed in', async () => {
    const { queue, sync, batches } = setup((batch) => Promise.resolve(savedAnswer(batch)), null);
    await enqueue(queue, 'c-1');

    await sync.flush();

    expect(batches).toEqual([]);
  });

  it('shares one running flush between concurrent callers', async () => {
    let calls = 0;
    const { queue, sync } = setup((batch) => {
      calls += 1;
      return Promise.resolve(savedAnswer(batch));
    });
    await enqueue(queue, 'c-1');

    await Promise.all([sync.flush(), sync.flush()]);

    expect(calls).toBe(1);
  });
});
