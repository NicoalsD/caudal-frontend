import { describe, expect, it } from 'vitest';

import { CommandQueue } from '../core/commands/CommandQueue';
import { InMemoryOutboxRepository } from '../core/commands/InMemoryOutboxRepository';
import type { OutboxOwner } from '../core/commands/OutboxRecord';
import { SubmitReadingCommand } from '../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../core/commands/SubmitReadingCommand';
import { DomainError } from '../core/errors/DomainError';
import { NetworkError } from '../core/errors/NetworkError';
import type { ReadingInput } from '../services/api/views';
import { FakeClock } from '../test/fakes/FakeClock';
import { OutboxSync } from './OutboxSync';
import type { ReadingSubmitter } from './OutboxSync';

const OWNER: OutboxOwner = { userId: 'u-1', aqueductId: 'a-1' };
const PAYLOAD: SubmitReadingPayload = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

function setup(submit: ReadingSubmitter['submit']) {
  const repository = new InMemoryOutboxRepository();
  const queue = new CommandQueue(repository, new FakeClock(0));
  const sent: ReadingInput[] = [];
  const sync = new OutboxSync(queue, {
    submit: (input) => {
      sent.push(input);
      return submit(input);
    },
  });
  return { queue, sync, sent };
}

describe('OutboxSync', () => {
  it('sends each pending reading with its client id and removes it when saved', async () => {
    const { queue, sync, sent } = setup(() => Promise.resolve(undefined));
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);

    await sync.flush(OWNER);

    expect(sent).toEqual([
      expect.objectContaining({
        id: 'c-1',
        tankId: 't-1',
        gaugeValue: 2.1,
        observedAt: new Date(PAYLOAD.observedAt),
      }),
    ]);
    expect(await queue.pendingFor(OWNER)).toEqual([]);
  });

  it('keeps a reading the server refused for correction', async () => {
    const { queue, sync } = setup(() =>
      Promise.reject(new DomainError('GAUGE_OUT_OF_RANGE', 'fuera de rango')),
    );
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);

    await sync.flush(OWNER);

    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'c-1', lastErrorCode: 'GAUGE_OUT_OF_RANGE' }),
    ]);
  });

  it('keeps a reading pending when there is no connection', async () => {
    const { queue, sync } = setup(() => Promise.reject(new NetworkError()));
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);

    await sync.flush(OWNER);

    expect(await queue.pendingFor(OWNER)).toEqual([
      expect.objectContaining({ status: 'PENDING', attempts: 1 }),
    ]);
  });

  it('never sends the readings of another owner', async () => {
    const { queue, sync, sent } = setup(() => Promise.resolve(undefined));
    await queue.enqueue(
      new SubmitReadingCommand('c-2', PAYLOAD),
      { userId: 'u-2', aqueductId: 'a-1' },
      null,
    );

    await sync.flush(OWNER);

    expect(sent).toEqual([]);
  });

  it('marks a stored record that is not a reading for correction without sending it', async () => {
    const repository = new InMemoryOutboxRepository();
    const queue = new CommandQueue(repository, new FakeClock(0));
    await repository.put({
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
    });
    const sync = new OutboxSync(queue, {
      submit: () => Promise.reject(new Error('must not be sent')),
    });

    await sync.flush(OWNER);

    expect(await queue.correctionsFor(OWNER)).toEqual([
      expect.objectContaining({ clientId: 'bad', lastErrorCode: 'LOCAL_CORRUPT' }),
    ]);
  });

  it('shares one running flush between concurrent callers', async () => {
    let calls = 0;
    const { queue, sync } = setup(async () => {
      calls += 1;
      await Promise.resolve();
    });
    await queue.enqueue(new SubmitReadingCommand('c-1', PAYLOAD), OWNER, null);

    await Promise.all([sync.flush(OWNER), sync.flush(OWNER)]);

    expect(calls).toBe(1);
  });
});
