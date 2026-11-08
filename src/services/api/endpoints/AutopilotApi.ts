import type { DecisionStatus } from '../../../core/autopilot/autopilotModel';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import {
  toAssistantAnswer,
  toAutopilotDecision,
  toAutopilotSettings,
} from '../adapters/LiveAdapter';
import type { components } from '../schema';
import type { AssistantAnswerView, AutopilotDecisionView, AutopilotSettingsView } from '../views';

type SettingsDto = components['schemas']['AutopilotSettings'];
type UpdateSettingsDto = components['schemas']['UpdateAutopilotSettingsRequest'];
type DecisionDto = components['schemas']['AutopilotDecision'];
type DecisionListDto = components['schemas']['AutopilotDecisionList'];
type AnswerDto = components['schemas']['AssistantAnswer'];

export interface AutopilotSettingsInput {
  readonly mode: AutopilotSettingsView['mode'];
  readonly operatorAbsenceMinutes: number;
  readonly reserveFloorPct: number;
}

/** The autopilot and the assistant (contract v2 B). The server checks every permission. */
export class AutopilotApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /autopilot/settings (ASSISTANT_USE). */
  async getSettings(): Promise<AutopilotSettingsView> {
    const response = await this.http.request<SettingsDto>({
      method: 'GET',
      path: '/autopilot/settings',
    });
    return toAutopilotSettings(this.adapter, response.body);
  }

  /** PUT /autopilot/settings (AUTOPILOT_CONFIGURE). */
  async updateSettings(input: AutopilotSettingsInput): Promise<AutopilotSettingsView> {
    const body: UpdateSettingsDto = {
      mode: input.mode,
      operator_absence_minutes: input.operatorAbsenceMinutes,
      reserve_floor_pct: input.reserveFloorPct,
    };
    const response = await this.http.request<SettingsDto>({
      method: 'PUT',
      path: '/autopilot/settings',
      body,
    });
    return toAutopilotSettings(this.adapter, response.body);
  }

  /** GET /autopilot/decisions (ASSISTANT_USE), newest first. */
  async decisions(filter: {
    readonly status?: DecisionStatus;
    readonly limit?: number;
  }): Promise<AutopilotDecisionView[]> {
    const query: Record<string, string> = {};
    if (filter.status !== undefined) {
      query.status = filter.status;
    }
    if (filter.limit !== undefined) {
      query.limit = String(filter.limit);
    }
    const response = await this.http.request<DecisionListDto>({
      method: 'GET',
      path: '/autopilot/decisions',
      query,
    });
    return response.body.items.map((item) => toAutopilotDecision(this.adapter, item));
  }

  /** POST /autopilot/decisions/{id}/accept (VALVE_COMMAND_MANUAL): creates the command. */
  async accept(id: string): Promise<AutopilotDecisionView> {
    const response = await this.http.request<DecisionDto>({
      method: 'POST',
      path: `/autopilot/decisions/${encodeURIComponent(id)}/accept`,
      body: {},
    });
    return toAutopilotDecision(this.adapter, response.body);
  }

  /** POST /autopilot/decisions/{id}/reject (ASSISTANT_USE). */
  async reject(id: string, reason?: string): Promise<AutopilotDecisionView> {
    const response = await this.http.request<DecisionDto>({
      method: 'POST',
      path: `/autopilot/decisions/${encodeURIComponent(id)}/reject`,
      body: reason === undefined || reason === '' ? {} : { reason },
    });
    return toAutopilotDecision(this.adapter, response.body);
  }

  /** POST /autopilot/run (AUTOPILOT_CONFIGURE): forces a cycle now and returns its decisions. */
  async run(): Promise<AutopilotDecisionView[]> {
    const response = await this.http.request<DecisionListDto>({
      method: 'POST',
      path: '/autopilot/run',
      body: {},
    });
    return response.body.items.map((item) => toAutopilotDecision(this.adapter, item));
  }

  /** POST /assistant/ask (ASSISTANT_USE): the answer says whether the LLM or the rules wrote it. */
  async ask(question: string): Promise<AssistantAnswerView> {
    const response = await this.http.request<AnswerDto>({
      method: 'POST',
      path: '/assistant/ask',
      body: { question },
    });
    return toAssistantAnswer(this.adapter, response.body);
  }
}
