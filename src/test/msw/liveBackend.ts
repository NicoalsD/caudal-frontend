import { http, HttpResponse } from 'msw';

import type { components } from '../../services/api/schema';
import {
  buildAssistantAnswer,
  buildAutopilotSettings,
  buildDecision,
  buildLiveCommand,
  buildValveLive,
  COMMAND_ID,
  HIGH_VALVE_ID,
  SCHOOL_VALVE_ID,
} from '../factories/live';
import type { AutopilotSettingsDto, DecisionDto, ValveLiveDto } from '../factories/live';
import { SECTOR_SCHOOL_ID } from '../factories/rules';
import { apiUrl } from './apiUrl';
import { errorResponse } from './errorResponse';

type ManualCommandBody = components['schemas']['CreateManualValveCommandRequest'];
type CommandStatus = components['schemas']['ValveCommand']['status'];

const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const MIN_REASON_LENGTH = 10;
/** The fake actuator moves one step each time the valves are read. */
const COMMAND_STEPS: readonly CommandStatus[] = ['PENDING', 'DELIVERED', 'ACKED'];
const LAST_STEP = COMMAND_STEPS.length - 1;

/**
 * A small stateful fake of the live valves, the autopilot and the assistant. A manual command
 * advances PENDING, DELIVERED, ACKED on each GET /valves/live, and the valve takes its new state
 * when the command is ACKED, like the simulator's virtual model does. `failNextCommand` makes the
 * actuator answer FAILED instead.
 */
export function createLiveBackend(
  options: { readonly settings?: Partial<AutopilotSettingsDto> } = {},
) {
  const valves: ValveLiveDto[] = [
    buildValveLive({ valve_id: SCHOOL_VALVE_ID, sector_id: SECTOR_SCHOOL_ID, state: 'OPEN' }),
    buildValveLive({ valve_id: HIGH_VALVE_ID, state: 'CLOSED' }),
  ];
  let settings = buildAutopilotSettings(options.settings);
  const decisions: DecisionDto[] = [buildDecision()];
  const state = {
    commands: [] as ManualCommandBody[],
    accepted: [] as string[],
    rejected: [] as string[],
    questions: [] as string[],
    settingsPuts: [] as AutopilotSettingsDto[],
    failNextCommand: false,
    willFail: false,
  };
  let step = 0;
  let active: { valveId: string; action: 'OPEN' | 'CLOSE' } | null = null;

  const advance = (): void => {
    if (active === null) {
      return;
    }
    const valve = valves.find((item) => item.valve_id === active?.valveId);
    if (valve === undefined) {
      return;
    }
    step += 1;
    const status: CommandStatus =
      state.willFail && step >= LAST_STEP
        ? 'FAILED'
        : (COMMAND_STEPS[Math.min(step, LAST_STEP)] ?? 'ACKED');
    valve.last_command = buildLiveCommand({ action: active.action, status });
    if (status === 'ACKED') {
      valve.state = active.action === 'OPEN' ? 'OPEN' : 'CLOSED';
    }
    if (status === 'ACKED' || status === 'FAILED') {
      active = null;
    }
  };

  const handlers = [
    http.get(apiUrl('/valves/live'), () => {
      const body = { items: valves.map((valve) => ({ ...valve })) };
      advance();
      return HttpResponse.json(body);
    }),
    http.post(apiUrl('/valve-commands/manual'), async ({ request }) => {
      const body = (await request.json()) as ManualCommandBody;
      const target = valves.find((valve) => valve.valve_id === body.valve_id);
      if (target === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      if (body.manual_reason.length < MIN_REASON_LENGTH) {
        return errorResponse(UNPROCESSABLE_STATUS, 'REASON_REQUIRED');
      }
      state.commands.push(body);
      step = 0;
      state.willFail = state.failNextCommand;
      state.failNextCommand = false;
      active = { valveId: body.valve_id, action: body.command };
      target.last_command = buildLiveCommand({ action: body.command });
      return HttpResponse.json(
        {
          id: COMMAND_ID,
          valve_id: body.valve_id,
          command: body.command,
          status: 'PENDING',
          not_before: body.not_before,
          expires_at: body.expires_at,
        },
        { status: CREATED_STATUS },
      );
    }),
    http.get(apiUrl('/autopilot/settings'), () => HttpResponse.json(settings)),
    http.put(apiUrl('/autopilot/settings'), async ({ request }) => {
      const body = (await request.json()) as AutopilotSettingsDto;
      state.settingsPuts.push(body);
      settings = { ...settings, ...body };
      return HttpResponse.json(settings);
    }),
    http.get(apiUrl('/autopilot/decisions'), ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      return HttpResponse.json({
        items: decisions.filter((item) => status === null || item.status === status),
      });
    }),
    http.post(apiUrl('/autopilot/decisions/:id/accept'), ({ params }) => {
      const found = decisions.find((item) => item.id === params.id);
      if (found === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      state.accepted.push(found.id);
      found.status = 'ACCEPTED';
      return HttpResponse.json(found);
    }),
    http.post(apiUrl('/autopilot/decisions/:id/reject'), ({ params }) => {
      const found = decisions.find((item) => item.id === params.id);
      if (found === undefined) {
        return errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND');
      }
      state.rejected.push(found.id);
      found.status = 'REJECTED';
      return HttpResponse.json(found);
    }),
    http.post(apiUrl('/assistant/ask'), async ({ request }) => {
      const body = (await request.json()) as { question: string };
      state.questions.push(body.question);
      return HttpResponse.json(buildAssistantAnswer());
    }),
  ];

  return { handlers, state, valves, decisions };
}
