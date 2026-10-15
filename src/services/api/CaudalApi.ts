import type { HttpClient } from '../http/HttpClient';
import type { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { AuthApi } from './endpoints/AuthApi';
import { MetaApi } from './endpoints/MetaApi';
import { NetworkApi } from './endpoints/NetworkApi';
import { ImportsApi } from './endpoints/ImportsApi';
import { ReadingsApi } from './endpoints/ReadingsApi';
import { RulesApi } from './endpoints/RulesApi';
import { SystemApi } from './endpoints/SystemApi';
import { TankStatusApi } from './endpoints/TankStatusApi';

/**
 * Facade over the REST API (api-integration.md section 3). Features call business methods and
 * receive view models; routes, DTOs and the decorator chain stay behind it.
 * Each API area is a small class under ./endpoints; new areas are added here as phases land.
 *
 * @pattern P10 Facade
 */
export class CaudalApi {
  readonly auth: AuthApi;
  readonly meta: MetaApi;
  readonly network: NetworkApi;
  readonly readings: ReadingsApi;
  readonly rules: RulesApi;
  readonly system: SystemApi;
  readonly tankStatus: TankStatusApi;
  readonly imports: ImportsApi;

  constructor(http: HttpClient, adapter: ApiDtoAdapter) {
    this.auth = new AuthApi(http, adapter);
    this.meta = new MetaApi(http, adapter);
    this.network = new NetworkApi(http, adapter);
    this.readings = new ReadingsApi(http, adapter);
    this.rules = new RulesApi(http, adapter);
    this.system = new SystemApi(http, adapter);
    this.tankStatus = new TankStatusApi(http, adapter);
    this.imports = new ImportsApi(http);
  }
}
