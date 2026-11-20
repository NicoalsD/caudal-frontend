import { describe, expect, it } from 'vitest';

import { STATUS } from '../../test/constants';
import { NetworkError } from '../errors/NetworkError';
import {
  QUERY_RETRY_COUNT,
  SERVER_WAKE_QUERY_RETRIES,
  SERVER_WAKE_RETRY_BASE_DELAY_MS,
  SERVER_WAKE_RETRY_MAX_DELAY_MS,
} from './clientPolicy';
import { isServerUnreachable, queryRetryDelayMs, shouldRetryQuery } from './queryRetry';

const withStatus = (status: number) => Object.assign(new Error('http'), { status });
const DOUBLE = 2;
const ONLINE = true;
const OFFLINE = false;

describe('isServerUnreachable', () => {
  it('is true without an answer and for the answers of a proxy whose server is starting', () => {
    expect(isServerUnreachable(new NetworkError())).toBe(true);
    expect(isServerUnreachable(withStatus(STATUS.badGateway))).toBe(true);
    expect(isServerUnreachable(withStatus(STATUS.serviceUnavailable))).toBe(true);
    expect(isServerUnreachable(withStatus(STATUS.gatewayTimeout))).toBe(true);
  });

  it('is false for answers of the server itself', () => {
    expect(isServerUnreachable(withStatus(STATUS.internalServerError))).toBe(false);
    expect(isServerUnreachable(withStatus(STATUS.notFound))).toBe(false);
    expect(isServerUnreachable(new Error('other'))).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('never retries a client error', () => {
    expect(shouldRetryQuery(0, withStatus(STATUS.notFound), ONLINE)).toBe(false);
    expect(shouldRetryQuery(0, withStatus(STATUS.tooManyRequests), ONLINE)).toBe(false);
  });

  it('keeps trying an unreachable server while online, up to the wake-up limit', () => {
    expect(shouldRetryQuery(SERVER_WAKE_QUERY_RETRIES - 1, new NetworkError(), ONLINE)).toBe(true);
    expect(
      shouldRetryQuery(SERVER_WAKE_QUERY_RETRIES, withStatus(STATUS.serviceUnavailable), ONLINE),
    ).toBe(false);
  });

  it('gives up after the usual retry when the browser is offline', () => {
    expect(shouldRetryQuery(QUERY_RETRY_COUNT - 1, new NetworkError(), OFFLINE)).toBe(true);
    expect(shouldRetryQuery(QUERY_RETRY_COUNT, new NetworkError(), OFFLINE)).toBe(false);
  });

  it('retries a server error once', () => {
    expect(
      shouldRetryQuery(QUERY_RETRY_COUNT - 1, withStatus(STATUS.internalServerError), ONLINE),
    ).toBe(true);
    expect(
      shouldRetryQuery(QUERY_RETRY_COUNT, withStatus(STATUS.internalServerError), ONLINE),
    ).toBe(false);
  });
});

describe('queryRetryDelayMs', () => {
  it('doubles from the base delay and stops at the ceiling', () => {
    expect(queryRetryDelayMs(0)).toBe(SERVER_WAKE_RETRY_BASE_DELAY_MS);
    expect(queryRetryDelayMs(1)).toBe(SERVER_WAKE_RETRY_BASE_DELAY_MS * DOUBLE);
    expect(queryRetryDelayMs(SERVER_WAKE_QUERY_RETRIES)).toBe(SERVER_WAKE_RETRY_MAX_DELAY_MS);
  });
});
