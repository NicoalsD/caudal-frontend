import { SystemClock } from '../../core/time/SystemClock';
import { createHttpClient } from '../http/createHttpClient';
import { ConsoleLogger, NoopLogger } from '../http/Logger';
import { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { CaudalApi } from './CaudalApi';
import { readApiBaseUrl } from './config';

export interface ApiEnvironment {
  readonly VITE_API_BASE_URL?: string;
  /** True in `vite dev`: only then requests are logged to the console. */
  readonly DEV?: boolean;
}

/** Composition root of the services layer: environment -> decorated HttpClient -> CaudalApi. */
export function createCaudalApi(env: ApiEnvironment): CaudalApi {
  const http = createHttpClient({
    baseUrl: readApiBaseUrl(env),
    logger: env.DEV === true ? new ConsoleLogger() : new NoopLogger(),
    clock: new SystemClock(),
    random: () => Math.random(),
  });
  return new CaudalApi(http, new ApiDtoAdapter());
}
