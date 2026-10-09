import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { STATUS } from '../../test/constants';
import { FakeHttpClient, okResponse } from '../../test/fakes/FakeHttpClient';
import { ApiError } from './errors';
import type { HttpRequest } from './HttpClient';
import { RetryHttpClient } from './RetryHttpClient';
import { ExponentialBackoffRetryPolicy } from './RetryPolicy';

const GET: HttpRequest = { method: 'GET', path: '/tanks/1/status' };
const POST: HttpRequest = { method: 'POST', path: '/readings', body: {} };
const POST_WITH_KEY: HttpRequest = {
  ...POST,
  idempotencyKey: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81',
};

const apiError = (status: number, code: string): ApiError => new ApiError(status, code, 'mensaje');

const JITTER_RATIO = 0.2;
const HALF = 0.5;
const NO_JITTER = { random: () => 0 };
const BASE_DELAY = 500;
const MAX_DELAY = 5_000;
const TOTAL_CALLS = 3;
const BACKOFF_FACTOR = 2;
const ATTEMPTS_TO_CEILING = 6;
const SECOND_ATTEMPT = 2;
const THIRD_ATTEMPT = 3;
const ATTEMPT_LIMIT = 20;

function build(fake: FakeHttpClient, random: () => number = () => 0) {
  const waits: number[] = [];
  const wait = vi.fn((ms: number) => {
    waits.push(ms);
    return Promise.resolve();
  });
  const policy = new ExponentialBackoffRetryPolicy({ random });
  return { client: new RetryHttpClient(fake, policy, wait), waits, wait };
}

describe('RetryHttpClient', () => {
  it('repeats a GET that fails on the network twice and then answers', async () => {
    const fake = new FakeHttpClient(new NetworkError(), new NetworkError(), okResponse('ok'));
    const { client, waits } = build(fake);

    const response = await client.request<string>(GET);

    expect(response.body).toBe('ok');
    expect(fake.requests).toHaveLength(TOTAL_CALLS);
    expect(waits).toEqual([BASE_DELAY, BASE_DELAY * SECOND_ATTEMPT]);
  });

  it('repeats a GET after a 5xx', async () => {
    const fake = new FakeHttpClient(
      apiError(STATUS.serviceUnavailable, 'IA_UNAVAILABLE'),
      okResponse('ok'),
    );
    const { client } = build(fake);

    await expect(client.request(GET)).resolves.toMatchObject({ body: 'ok' });
    expect(fake.requests).toHaveLength(SECOND_ATTEMPT);
  });

  it('gives up after the maximum attempts and throws the last error', async () => {
    const last = new NetworkError();
    const fake = new FakeHttpClient(new NetworkError(), new NetworkError(), last);
    const { client } = build(fake);

    await expect(client.request(GET)).rejects.toBe(last);
    expect(fake.requests).toHaveLength(THIRD_ATTEMPT);
  });

  it('does not repeat a POST without an idempotency key', async () => {
    const fake = new FakeHttpClient(new NetworkError(), okResponse('ok'));
    const { client, wait } = build(fake);

    await expect(client.request(POST)).rejects.toBeInstanceOf(NetworkError);
    expect(fake.requests).toHaveLength(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it('repeats a POST that carries an idempotency key', async () => {
    const fake = new FakeHttpClient(new NetworkError(), okResponse('ok'));
    const { client } = build(fake);

    await expect(client.request(POST_WITH_KEY)).resolves.toMatchObject({ body: 'ok' });
    expect(fake.requests).toHaveLength(SECOND_ATTEMPT);
  });

  it.each([
    ['validation', STATUS.unprocessable, 'GAUGE_OUT_OF_RANGE'],
    ['unauthorized', STATUS.unauthorized, 'UNAUTHORIZED'],
    ['forbidden', STATUS.forbidden, 'FORBIDDEN'],
    ['rate limit', STATUS.tooManyRequests, 'RATE_LIMITED'],
  ])('does not repeat a %s error', async (_name, status, code) => {
    const error = apiError(status, code);
    const fake = new FakeHttpClient(error, okResponse('ok'));
    const { client } = build(fake);

    await expect(client.request(GET)).rejects.toBe(error);
    expect(fake.requests).toHaveLength(1);
  });

  it('does not repeat an aborted request', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    const fake = new FakeHttpClient(abort, okResponse('ok'));
    const { client } = build(fake);

    await expect(client.request(GET)).rejects.toBe(abort);
    expect(fake.requests).toHaveLength(1);
  });
});

describe('ExponentialBackoffRetryPolicy', () => {
  it('doubles the delay up to the ceiling', () => {
    const policy = new ExponentialBackoffRetryPolicy(NO_JITTER);
    const attempts = Array.from({ length: ATTEMPTS_TO_CEILING }, (_, index) => index + 1);

    const delays = attempts.map((attempt) => policy.delayMs(attempt));

    const [first, second, ...rest] = delays;
    expect(first).toBe(BASE_DELAY);
    expect(second).toBe(BASE_DELAY * BACKOFF_FACTOR);
    expect(rest[rest.length - 1]).toBe(MAX_DELAY);
    expect(Math.max(...delays)).toBe(MAX_DELAY);
  });

  it('never decreases with the attempt number and never exceeds the ceiling plus jitter', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.999, noNaN: true }), (random) => {
        const policy = new ExponentialBackoffRetryPolicy({ random: () => random });
        let previous = 0;
        for (let attempt = 1; attempt <= ATTEMPT_LIMIT; attempt += 1) {
          const delay = policy.delayMs(attempt);
          expect(delay).toBeGreaterThanOrEqual(previous);
          expect(delay).toBeLessThanOrEqual(Math.ceil(MAX_DELAY * (1 + JITTER_RATIO)));
          previous = delay;
        }
      }),
    );
  });

  it('adds jitter on top of the delay, never below it', () => {
    const policy = new ExponentialBackoffRetryPolicy({ random: () => HALF });

    expect(policy.delayMs(1)).toBe(BASE_DELAY * (1 + JITTER_RATIO * HALF));
  });
});
