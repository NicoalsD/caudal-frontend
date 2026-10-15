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
      { clientId: 'a', status: 'PENDING', attempts: ATTEMPTS, lastErrorCode: 'NETWORK' },
    ]);
  });

  it('is empty for an empty queue', () => {
    expect(summarizeOutbox([])).toEqual({
      pendingCount: 0,
      sendingCount: 0,
      needsReviewCount: 0,
      items: [],
    });
  });
});
