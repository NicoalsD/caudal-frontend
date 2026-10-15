import type { HttpClient } from '../http/HttpClient';
import type { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { AuthApi } from './endpoints/AuthApi';
import { CatalogApi } from './endpoints/CatalogApi';
import { IncidentsApi } from './endpoints/IncidentsApi';
import { MetaApi } from './endpoints/MetaApi';
import { NetworkApi } from './endpoints/NetworkApi';
import { ProposalsApi } from './endpoints/ProposalsApi';
import { PublicApi } from './endpoints/PublicApi';
import { RulesApi } from './endpoints/RulesApi';
import { SystemApi } from './endpoints/SystemApi';

/**
 * Facade over the REST API (api-integration.md section 3). Features call business methods and
 * receive view models; routes, DTOs and the decorator chain stay behind it.
 * Each API area is a small class under ./endpoints; new areas are added here as phases land.
 *
 * @pattern P10 Facade
 */
export class CaudalApi {
  readonly auth: AuthApi;
  readonly catalogs: CatalogApi;
  readonly incidents: IncidentsApi;
  readonly meta: MetaApi;
  readonly network: NetworkApi;
  /** Schedule proposals of the Board (section 10). */
  readonly proposals: ProposalsApi;
  /** The public pages without login (section 15). */
  readonly public: PublicApi;
  readonly rules: RulesApi;
  readonly system: SystemApi;

  /** `apiBaseUrl` is the absolute API base (with /api/v1): links to files are built from it. */
  constructor(http: HttpClient, adapter: ApiDtoAdapter, apiBaseUrl: string) {
    this.auth = new AuthApi(http, adapter);
    this.catalogs = new CatalogApi(http, adapter);
    this.incidents = new IncidentsApi(http, adapter);
    this.meta = new MetaApi(http, adapter);
    this.network = new NetworkApi(http, adapter);
    this.proposals = new ProposalsApi(http, adapter);
    this.public = new PublicApi(http, adapter, apiBaseUrl);
    this.rules = new RulesApi(http, adapter);
    this.system = new SystemApi(http, adapter);
  }
}
