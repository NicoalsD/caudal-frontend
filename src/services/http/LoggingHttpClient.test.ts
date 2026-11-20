import { describe, expect, it } from 'vitest';

import { NetworkError } from '../../core/errors/NetworkError';
import { STATUS } from '../../test/constants';
import { FakeClock } from '../../test/fakes/FakeClock';
import { FakeHttpClient, okResponse } from '../../test/fakes/FakeHttpClient';
import { ApiError } from './errors';
import type { LogFields, Logger } from './Logger';
import { HTTP_REQUEST_EVENT, LoggingHttpClient } from './LoggingHttpClient';

interface Entry {
  readonly level: 'info' | 'warn';
  readonly event: string;
  readonly fields: LogFields;
}

class RecordingLogger implements Logger {
  readonly entries: Entry[] = [];

  info(event: string, fields: LogFields): void {
    this.entries.push({ level: 'info', event, fields });
  }

  warn(event: string, fields: LogFields): void {
    this.entries.push({ level: 'warn', event, fields });
  }
}

const REQUEST_ID = '7f3c2a9e-1d4b-4e1a-9c0e-2b8f5a6d1e33';
const SECRET_PASSWORD = 'Sup3r-secreta-no-registrar';
const LOGIN = {
  method: 'POST',
  path: '/auth/login',
  query: { token: 'abc123' },
  body: { username: 'usuario-prueba', password: SECRET_PASSWORD },
} as const;

class AdvancingClient extends FakeHttpClient {
  constructor(
    private readonly clock: FakeClock,
    private readonly ms: number,
    ...script: ConstructorParameters<typeof FakeHttpClient>
  ) {
    super(...script);
  }

  override request<T>(...args: Parameters<FakeHttpClient['request']>) {
    this.clock.advance(this.ms);
    return super.request<T>(...args);
  }
}

const ELAPSED_MS = 120;

describe('LoggingHttpClient', () => {
  it('logs method, path, status, duration and request id of a success', async () => {
    const clock = new FakeClock();
    const logger = new RecordingLogger();
    const inner = new AdvancingClient(clock, ELAPSED_MS, okResponse({ ok: true }, REQUEST_ID));
    const client = new LoggingHttpClient(inner, logger, clock);

    const response = await client.request({ method: 'GET', path: '/tanks/1/status' });

    expect(response.body).toEqual({ ok: true });
    expect(logger.entries).toEqual([
      {
        level: 'info',
        event: HTTP_REQUEST_EVENT,
        fields: {
          method: 'GET',
          path: '/tanks/1/status',
          status: STATUS.ok,
          durationMs: ELAPSED_MS,
          requestId: REQUEST_ID,
        },
      },
    ]);
  });

  it('logs an ApiError with its code and rethrows the same error', async () => {
    const clock = new FakeClock();
    const logger = new RecordingLogger();
    const error = new ApiError(
      STATUS.unprocessable,
      'GAUGE_OUT_OF_RANGE',
      'mensaje',
      {},
      REQUEST_ID,
    );
    const client = new LoggingHttpClient(new FakeHttpClient(error), logger, clock);

    await expect(client.request({ method: 'POST', path: '/readings', body: {} })).rejects.toBe(
      error,
    );

    expect(logger.entries[0]).toMatchObject({
      level: 'warn',
      fields: { status: STATUS.unprocessable, code: 'GAUGE_OUT_OF_RANGE', requestId: REQUEST_ID },
    });
  });

  it('logs a network failure without status', async () => {
    const logger = new RecordingLogger();
    const client = new LoggingHttpClient(
      new FakeHttpClient(new NetworkError()),
      logger,
      new FakeClock(),
    );

    await expect(client.request({ method: 'GET', path: '/a' })).rejects.toBeInstanceOf(
      NetworkError,
    );

    expect(logger.entries[0]?.fields).toMatchObject({ status: null, code: 'NETWORK_ERROR' });
  });

  it('never records bodies, query strings or secrets', async () => {
    const logger = new RecordingLogger();
    const failing = new FakeHttpClient(
      new ApiError(STATUS.unauthorized, 'INVALID_CREDENTIALS', 'mensaje'),
      okResponse({ access_token: 'jwt-secreto' }),
    );
    const client = new LoggingHttpClient(failing, logger, new FakeClock());

    await client.request(LOGIN).catch(() => undefined);
    await client.request(LOGIN);

    const serialized = JSON.stringify(logger.entries);
    expect(serialized).not.toContain(SECRET_PASSWORD);
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('jwt-secreto');
    expect(serialized).not.toContain('usuario-prueba');
  });
});
