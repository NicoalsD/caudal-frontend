import { describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import type { Scheduler } from '../../core/time/Scheduler';
import { STATUS } from '../../test/constants';
import type { HttpClient, HttpRequest, HttpResponse } from './HttpClient';
import { ReachabilityHttpClient } from './ReachabilityHttpClient';

const REQUEST: HttpRequest = { method: 'GET', path: '/meta/constraints' };
const SLOW_AFTER_MS = 5_000;
const OK: HttpResponse<unknown> = { status: STATUS.ok, body: {} } as HttpResponse<unknown>;

/** Runs the timers only when the test says so. */
class ManualScheduler implements Scheduler {
  private task: (() => void) | null = null;
  delayMs: number | null = null;
  cancelled = false;

  after(delayMs: number, task: () => void): () => void {
    this.delayMs = delayMs;
    this.task = task;
    return () => {
      this.cancelled = true;
    };
  }

  fire(): void {
    if (!this.cancelled) {
      this.task?.();
    }
  }
}

function setup(result: () => Promise<HttpResponse<unknown>>) {
  const inner: HttpClient = { request: vi.fn(result) as HttpClient['request'] };
  const reporter = { reportReachable: vi.fn(), reportUnreachable: vi.fn() };
  const scheduler = new ManualScheduler();
  const client = new ReachabilityHttpClient(inner, reporter, scheduler, SLOW_AFTER_MS);
  return { client, reporter, scheduler };
}

describe('ReachabilityHttpClient', () => {
  it('reports the server reachable when it answers, and drops the slow timer', async () => {
    const { client, reporter, scheduler } = setup(() => Promise.resolve(OK));

    await client.request(REQUEST);

    expect(reporter.reportReachable).toHaveBeenCalledOnce();
    expect(reporter.reportUnreachable).not.toHaveBeenCalled();
    expect(scheduler.delayMs).toBe(SLOW_AFTER_MS);
    expect(scheduler.cancelled).toBe(true);
  });

  it('reports it unreachable without an answer, and passes the same error on', async () => {
    const failure = new NetworkError();
    const { client, reporter } = setup(() => Promise.reject(failure));

    await expect(client.request(REQUEST)).rejects.toBe(failure);
    expect(reporter.reportUnreachable).toHaveBeenCalledOnce();
  });

  it('reports it unreachable when the proxy says the service is not up', async () => {
    const failure = Object.assign(new Error('proxy'), { status: STATUS.serviceUnavailable });
    const { client, reporter } = setup(() => Promise.reject(failure));

    await expect(client.request(REQUEST)).rejects.toBe(failure);
    expect(reporter.reportUnreachable).toHaveBeenCalledOnce();
  });

  it('counts an error answer of the server as reachable', async () => {
    const failure = Object.assign(new Error('not found'), { status: STATUS.notFound });
    const { client, reporter } = setup(() => Promise.reject(failure));

    await expect(client.request(REQUEST)).rejects.toBe(failure);
    expect(reporter.reportReachable).toHaveBeenCalledOnce();
  });

  it('reports a request held open past the limit as unreachable, then reachable when it answers', async () => {
    let answer: (response: HttpResponse<unknown>) => void = () => undefined;
    const { client, reporter, scheduler } = setup(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    );

    const pending = client.request(REQUEST);
    scheduler.fire();
    expect(reporter.reportUnreachable).toHaveBeenCalledOnce();

    answer(OK);
    await pending;
    expect(reporter.reportReachable).toHaveBeenCalledOnce();
  });
});
