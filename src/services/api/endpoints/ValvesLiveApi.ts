import type { ValveAction } from '../../../core/valves/valveModel';
import type { HttpClient } from '../../http/HttpClient';
import type { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { toValveCommand, toValveLive } from '../adapters/LiveAdapter';
import type { components } from '../schema';
import type { ValveCommandView, ValveLiveView } from '../views';

type ValveLiveListDto = components['schemas']['ValveLiveList'];
type ValveCommandDto = components['schemas']['ValveCommand'];
type ManualCommandDto = components['schemas']['CreateManualValveCommandRequest'];

/** Input of a manual command. The window (`notBefore`, `expiresAt`) is set by the caller. */
export interface ManualValveCommandInput {
  readonly valveId: string;
  readonly action: ValveAction;
  readonly reason: string;
  readonly notBefore: Date;
  readonly expiresAt: Date;
}

/** The valves as they are now, and the manual commands to them (contract v2 B, API.md 16.6). */
export class ValvesLiveApi {
  constructor(
    private readonly http: HttpClient,
    private readonly adapter: ApiDtoAdapter,
  ) {}

  /** GET /valves/live (NETWORK_VIEW): state and last command of each valve. */
  async list(): Promise<ValveLiveView[]> {
    const response = await this.http.request<ValveLiveListDto>({
      method: 'GET',
      path: '/valves/live',
    });
    return response.body.items.map((item) => toValveLive(this.adapter, item));
  }

  /** POST /valve-commands/manual (VALVE_COMMAND_MANUAL): the command starts as PENDING. */
  async sendManual(input: ManualValveCommandInput): Promise<ValveCommandView> {
    const body: ManualCommandDto = {
      valve_id: input.valveId,
      command: input.action,
      manual_reason: input.reason,
      not_before: input.notBefore.toISOString(),
      expires_at: input.expiresAt.toISOString(),
    };
    const response = await this.http.request<ValveCommandDto>({
      method: 'POST',
      path: '/valve-commands/manual',
      body,
    });
    return toValveCommand(this.adapter, response.body);
  }
}
