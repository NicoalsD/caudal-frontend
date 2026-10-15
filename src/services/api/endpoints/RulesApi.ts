import type { RuleSetChanges, RuleSetStatus } from '../../../core/rules/ruleSetParts';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import type { components } from '../schema';
import type { RuleSetSummaryView, RuleSetView } from '../views';

type RuleSetDto = components['schemas']['RuleSet'];
type RuleSetPageDto = components['schemas']['RuleSetPage'];
type UpdateRuleSetDto = components['schemas']['UpdateRuleSetRequest'];
type CreateRuleSetDto = components['schemas']['CreateRuleSetRequest'];
type ActivateRuleSetDto = components['schemas']['ActivateRuleSetRequest'];

/** The Junta's rules, versioned (API.md section 6). */
export class RulesApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /rule-sets/current: the ACTIVE version, the most read endpoint of the API. */
  async current(): Promise<RuleSetView> {
    const response = await this.http.request<RuleSetDto>({
      method: 'GET',
      path: '/rule-sets/current',
    });
    return this.adapter.toRuleSet(response.body);
  }

  /** GET /rule-sets/{id}. */
  async get(id: string): Promise<RuleSetView> {
    const response = await this.http.request<RuleSetDto>({
      method: 'GET',
      path: `/rule-sets/${encodeURIComponent(id)}`,
    });
    return this.adapter.toRuleSet(response.body);
  }

  /** GET /rule-sets filtered by status (first page only: there is at most one open draft). */
  async list(status: RuleSetStatus): Promise<RuleSetSummaryView[]> {
    const response = await this.http.request<RuleSetPageDto>({
      method: 'GET',
      path: '/rule-sets',
      query: { status },
    });
    return response.body.items.map((item) => this.adapter.toRuleSetSummary(item));
  }

  /** POST /rule-sets: a draft copied from the ACTIVE version. The reason is optional here. */
  async createDraft(changeReason?: string): Promise<RuleSetView> {
    const body: CreateRuleSetDto =
      changeReason === undefined ? {} : { change_reason: changeReason };
    const response = await this.http.request<RuleSetDto>({
      method: 'POST',
      path: '/rule-sets',
      body,
    });
    return this.adapter.toRuleSet(response.body);
  }

  /** PATCH /rule-sets/{id} (DRAFT only). Only the lists that changed are sent. */
  async updateDraft(id: string, changes: RuleSetChanges): Promise<RuleSetView> {
    const body: UpdateRuleSetDto = {
      ...(changes.bands === undefined
        ? {}
        : {
            bands: changes.bands.map((band) => ({
              band: band.band,
              min_level: band.minLevel,
              max_level: band.maxLevel,
              daily_service_hours: band.dailyServiceHours,
              priority_only: band.priorityOnly,
            })),
          }),
      ...(changes.sectors === undefined
        ? {}
        : {
            sectors: changes.sectors.map((sector) => ({
              sector_id: sector.sectorId,
              is_included: sector.isIncluded,
              is_priority: sector.isPriority,
              priority_rank: sector.priorityRank,
            })),
          }),
      ...(changes.operatingWindows === undefined
        ? {}
        : {
            operating_windows: changes.operatingWindows.map((window) => ({
              day_of_week: window.dayOfWeek,
              start_time: window.start,
              end_time: window.end,
            })),
          }),
    };
    const response = await this.http.request<RuleSetDto>({
      method: 'PATCH',
      path: `/rule-sets/${encodeURIComponent(id)}`,
      body,
    });
    return this.adapter.toRuleSet(response.body);
  }

  /** POST /rule-sets/{id}/activate: only BOARD_ADMIN, with a reason of 10 to 500 characters. */
  async activate(id: string, changeReason: string): Promise<RuleSetView> {
    const body: ActivateRuleSetDto = { change_reason: changeReason };
    const response = await this.http.request<RuleSetDto>({
      method: 'POST',
      path: `/rule-sets/${encodeURIComponent(id)}/activate`,
      body,
    });
    return this.adapter.toRuleSet(response.body);
  }
}
