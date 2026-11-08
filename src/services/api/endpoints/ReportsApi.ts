import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toNarrativeReport, toReport } from '../adapters/ReportsAdapter';
import type { components } from '../schema';
import type { NarrativeReportView, ReportView } from '../views';

type ReportDto = components['schemas']['Report'];
type NarrativeDto = components['schemas']['NarrativeReport'];
type NarrativeRequestDto = components['schemas']['NarrativeReportRequest'];

/** A period as instants: `from` inclusive, `to` exclusive, at most 92 days (API.md 20.9). */
export interface ReportPeriod {
  readonly from: string;
  readonly to: string;
}

/** The reports of a period (REPORT_VIEW): the numbers, and the narrative the assistant writes. */
export class ReportsApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /reports. */
  async get(period: ReportPeriod): Promise<ReportView> {
    const response = await this.http.request<ReportDto>({
      method: 'GET',
      path: '/reports',
      query: { from: period.from, to: period.to },
    });
    return toReport(this.adapter, response.body);
  }

  /** POST /reports/narrative: asks the assistant, so it can take seconds. */
  async narrative(period: ReportPeriod): Promise<NarrativeReportView> {
    const body: NarrativeRequestDto = { from: period.from, to: period.to };
    const response = await this.http.request<NarrativeDto>({
      method: 'POST',
      path: '/reports/narrative',
      body,
    });
    return toNarrativeReport(this.adapter, response.body);
  }
}
