import { describe, expect, it } from 'vitest';

import type { OutboxRecord, OutboxStatus } from './OutboxRecord';
import { summarizeOutbox } from './summarizeOutbox';

const ATTEMPTS = 2;
const UNSENT_ITEMS = 2;

function record(clientId: string, status: OutboxStatus): OutboxRecord {
  return {
    clientId,
    kind: 'SUBMIT_READING',
    status,
    userId: 'u-1',
    aqueductId: 'a-1',
    payload: {},
    createdAt: '2026-10-14T08:00:00.000Z',
    ruleSetVersionId: null,
    attempts: ATTEMPTS,
    nextAttemptAtMs: null,
    lastErrorCode: 'NETWORK',
    lastErrorAtMs: null,
  };
}

const VALID_PAYLOAD = {
  tankId: 't-1',
  gaugeValue: 2.1,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

describe('summarizeOutbox', () => {
  it('counts waiting and sending items apart from the ones to review', () => {
    const summary = summarizeOutbox([
      record('a', 'PENDING'),
      record('b', 'SENDING'),
      record('c', 'CORRECTION_PENDING'),
    ]);

    expect(summary.pendingCount).toBe(UNSENT_ITEMS);
    expect(summary.sendingCount).toBe(1);
    expect(summary.needsReviewCount).toBe(1);
  });

  it('keeps the status and attempts of each item', () => {
    const summary = summarizeOutbox([record('a', 'PENDING')]);

    expect(summary.items).toEqual([
      expect.objectContaining({
        clientId: 'a',
        status: 'PENDING',
        attempts: ATTEMPTS,
        lastErrorCode: 'NETWORK',
      }),
    ]);
  });

  it('reads the value and the time of each item, and leaves them empty when corrupt', () => {
    const valid = { ...record('a', 'PENDING'), payload: VALID_PAYLOAD };
    const corrupt = { ...record('b', 'CORRECTION_PENDING'), payload: 'broken' };

    const summary = summarizeOutbox([valid, corrupt]);

    expect(summary.items).toEqual([
      expect.objectContaining({
        clientId: 'a',
        gaugeValue: 2.1,
        observedAt: VALID_PAYLOAD.observedAt,
      }),
      expect.objectContaining({ clientId: 'b', gaugeValue: null, observedAt: null }),
    ]);
  });

  it('lists what left the queue during the session', () => {
    const summary = summarizeOutbox(
      [],
      [
        {
          clientId: 'c',
          owner: { userId: 'u-1', aqueductId: 'a-1' },
          outcome: 'DISCARDED',
          payload: VALID_PAYLOAD,
          reason: 'Dato duplicado',
          closedAtMs: 0,
        },
      ],
    );

    expect(summary.closed).toEqual([
      {
        clientId: 'c',
        outcome: 'DISCARDED',
        gaugeValue: 2.1,
        observedAt: VALID_PAYLOAD.observedAt,
        tankId: VALID_PAYLOAD.tankId,
        reason: 'Dato duplicado',
      },
    ]);
  });

  it('is empty for an empty queue', () => {
    expect(summarizeOutbox([])).toEqual({
      pendingCount: 0,
      sendingCount: 0,
      needsReviewCount: 0,
      items: [],
      closed: [],
    });
  });
});
