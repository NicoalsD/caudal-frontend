import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/DomainError';
import { NetworkError } from '../errors/NetworkError';
import { isBatchIdReused, outcomeForAnswer, outcomeForWholeBatch } from './batchOutcome';

describe('outcomeForAnswer', () => {
  it('counts accepted, flagged and replayed readings as saved', () => {
    for (const status of ['ACCEPTED', 'FLAGGED', 'REPLAYED']) {
      expect(outcomeForAnswer({ id: 'c-1', status, errorCode: null })).toEqual({ type: 'SAVED' });
    }
  });

  it('sends a validation refusal to the person, with its code', () => {
    expect(
      outcomeForAnswer({ id: 'c-1', status: 'REJECTED', errorCode: 'GAUGE_OUT_OF_RANGE' }),
    ).toEqual({ type: 'REJECTED', code: 'GAUGE_OUT_OF_RANGE' });
  });

  it('treats a refusal without code as a validation refusal', () => {
    expect(outcomeForAnswer({ id: 'c-1', status: 'REJECTED', errorCode: null })).toEqual({
      type: 'REJECTED',
      code: 'VALIDATION_ERROR',
    });
  });

  it('retries an item the answer does not mention, and an unknown status', () => {
    expect(outcomeForAnswer(undefined)).toEqual({ type: 'UNANSWERED' });
    expect(outcomeForAnswer({ id: 'c-1', status: 'SOMETHING_NEW', errorCode: null })).toEqual({
      type: 'RETRY',
      code: 'SOMETHING_NEW',
    });
  });
});

describe('isBatchIdReused', () => {
  it('recognizes the 409 of a reused batch id', () => {
    expect(isBatchIdReused(new DomainError('CONFLICT', 'x'))).toBe(true);
    expect(isBatchIdReused(new DomainError('NOT_FOUND', 'x'))).toBe(false);
    expect(isBatchIdReused(new NetworkError())).toBe(false);
  });
});

describe('outcomeForWholeBatch', () => {
  it('refuses every item of a batch the server calls invalid', () => {
    expect(outcomeForWholeBatch('VALIDATION_ERROR')).toEqual({
      type: 'REJECTED',
      code: 'VALIDATION_ERROR',
    });
  });

  it('retries the batch when the failure is not about its content', () => {
    expect(outcomeForWholeBatch('INTERNAL_ERROR')).toEqual({
      type: 'RETRY',
      code: 'INTERNAL_ERROR',
    });
    expect(outcomeForWholeBatch(null)).toEqual({ type: 'RETRY', code: 'NETWORK' });
  });
});
