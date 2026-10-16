import { describe, expect, it, vi } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { STATUS } from '../../test/constants';
import type { HttpClient, HttpRequest } from './HttpClient';
import { ReachabilityHttpClient } from './ReachabilityHttpClient';

const REQUEST: HttpRequest = { method: 'GET', path: '/meta/constraints' };

function setup(result: () => Promise<unknown>) {
  const inner: HttpClient = { request: vi.fn(result) as HttpClient['request'] };
  const reporter = { reportReachable: vi.fn(), reportUnreachable: vi.fn() };
  return { client: new ReachabilityHttpClient(inner, reporter), reporter };
}

describe('ReachabilityHttpClient', () => {
  it('reports the server reachable when it answers', async () => {
    const { client, reporter } = setup(() => Promise.resolve({ status: STATUS.ok, body: {} }));

    await client.request(REQUEST);

    expect(reporter.reportReachable).toHaveBeenCalledOnce();
    expect(reporter.reportUnreachable).not.toHaveBeenCalled();
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
});
