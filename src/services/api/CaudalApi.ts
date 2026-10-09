import type { HttpClient } from '../http/HttpClient';
import type { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { MetaApi } from './endpoints/MetaApi';
import { SystemApi } from './endpoints/SystemApi';

/**
 * Facade over the REST API (api-integration.md section 3). Features call business methods and
 * receive view models; routes, DTOs and the decorator chain stay behind it.
 * Each API area is a small class under ./endpoints; new areas are added here as phases land.
 *
 * @pattern P10 Facade
 */
export class CaudalApi {
  readonly meta: MetaApi;
  readonly system: SystemApi;

  constructor(http: HttpClient, adapter: ApiDtoAdapter) {
    this.meta = new MetaApi(http, adapter);
    this.system = new SystemApi(http, adapter);
  }
}
