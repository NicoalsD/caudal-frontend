import type { HttpClient } from '../http/HttpClient';
import type { ApiDtoAdapter } from './adapters/ApiDtoAdapter';
import { AuthApi } from './endpoints/AuthApi';
import { CatalogApi } from './endpoints/CatalogApi';
import { IncidentsApi } from './endpoints/IncidentsApi';
import { MetaApi } from './endpoints/MetaApi';
import { NetworkApi } from './endpoints/NetworkApi';
import { ProposalsApi } from './endpoints/ProposalsApi';
import { ImportsApi } from './endpoints/ImportsApi';
import { ReadingsApi } from './endpoints/ReadingsApi';
import { PublicApi } from './endpoints/PublicApi';
import { RulesApi } from './endpoints/RulesApi';
import { SystemApi } from './endpoints/SystemApi';
import { ScheduleApi } from './endpoints/ScheduleApi';
import { ClosureApi } from './endpoints/ClosureApi';
import { MinutesApi } from './endpoints/MinutesApi';
import { AnomaliesApi } from './endpoints/AnomaliesApi';
import { TankStatusApi } from './endpoints/TankStatusApi';
import { UsersApi } from './endpoints/UsersApi';
import { PrivacyApi } from './endpoints/PrivacyApi';
import { SummariesApi } from './endpoints/SummariesApi';
import { AuditApi } from './endpoints/AuditApi';
import { DevicesApi } from './endpoints/DevicesApi';
import { EvaluationApi } from './endpoints/EvaluationApi';

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
  readonly readings: ReadingsApi;
  /** The public pages without login (section 15). */
  readonly public: PublicApi;
  readonly rules: RulesApi;
  readonly system: SystemApi;
  readonly tankStatus: TankStatusApi;
  readonly anomalies: AnomaliesApi;
  readonly imports: ImportsApi;
  /** Published shifts of a day and the executions of each one (API.md 10 and 11). */
  readonly schedule: ScheduleApi;
  /** The closure of a day (API.md 11.2 and 11.3). */
  readonly closure: ClosureApi;
  /** The Board's actas (API.md 13). */
  readonly minutes: MinutesApi;
  /** Accounts, one-time codes and memberships (API.md section 3). */
  readonly users: UsersApi;
  /** The privacy notice in effect and its acceptance (API.md section 4). */
  readonly privacy: PrivacyApi;
  /** Summaries and their authorizations (API.md section 13). */
  readonly summaries: SummariesApi;
  /** The audit log and the security events (API.md section 18). */
  readonly audit: AuditApi;
  /** Registered devices, their status and their keys (API.md section 16). */
  readonly devices: DevicesApi;
  /** Whether the AI helps against the simple estimate (API.md section 14). */
  readonly evaluation: EvaluationApi;

  /** `apiBaseUrl` is the absolute API base (with /api/v1): links to files are built from it. */
  constructor(http: HttpClient, adapter: ApiDtoAdapter, apiBaseUrl: string) {
    this.auth = new AuthApi(http, adapter);
    this.catalogs = new CatalogApi(http, adapter);
    this.incidents = new IncidentsApi(http, adapter);
    this.meta = new MetaApi(http, adapter);
    this.network = new NetworkApi(http, adapter);
    this.proposals = new ProposalsApi(http, adapter);
    this.readings = new ReadingsApi(http, adapter);
    this.public = new PublicApi(http, adapter, apiBaseUrl);
    this.rules = new RulesApi(http, adapter);
    this.system = new SystemApi(http, adapter);
    this.tankStatus = new TankStatusApi(http, adapter);
    this.anomalies = new AnomaliesApi(http, adapter);
    this.imports = new ImportsApi(http);
    this.schedule = new ScheduleApi(http, adapter);
    this.closure = new ClosureApi(http, adapter);
    this.minutes = new MinutesApi(http, adapter);
    this.users = new UsersApi(http, adapter);
    this.privacy = new PrivacyApi(http, adapter);
    this.summaries = new SummariesApi(http, adapter);
    this.audit = new AuditApi(http, adapter);
    this.devices = new DevicesApi(http, adapter);
    this.evaluation = new EvaluationApi(http);
  }
}
