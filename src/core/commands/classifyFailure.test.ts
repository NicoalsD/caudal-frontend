import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/DomainError';
import { NetworkError } from '../errors/NetworkError';
import { NETWORK_CODE, classifyFailure } from './classifyFailure';

describe('classifyFailure', () => {
  it('refuses a reading the server rejects with a validation code', () => {
    expect(classifyFailure(new DomainError('GAUGE_OUT_OF_RANGE', 'x'))).toEqual({
      type: 'REJECTED',
      code: 'GAUGE_OUT_OF_RANGE',
      details: {},
    });
  });

  it('retries a server error that is not a validation code', () => {
    expect(classifyFailure(new DomainError('INTERNAL_ERROR', 'x'))).toEqual({
      type: 'RETRY',
      code: 'INTERNAL_ERROR',
    });
  });

  it('retries when there was no answer at all', () => {
    expect(classifyFailure(new NetworkError())).toEqual({ type: 'RETRY', code: NETWORK_CODE });
  });

  it('retries any unexpected failure', () => {
    expect(classifyFailure(new Error('boom'))).toEqual({ type: 'RETRY', code: NETWORK_CODE });
  });
});
