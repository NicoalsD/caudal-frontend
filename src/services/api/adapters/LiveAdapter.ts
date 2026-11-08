import {
  ANSWER_SOURCES,
  AUTOPILOT_MODES,
  DECISION_ACTIONS,
  DECISION_STATUSES,
} from '../../../core/autopilot/autopilotModel';
import {
  COMMAND_ORIGINS,
  COMMAND_STATUSES,
  VALVE_ACTIONS,
  VALVE_STATES,
} from '../../../core/valves/valveModel';
import type { components } from '../schema';
import type {
  AssistantAnswerView,
  AutopilotDecisionView,
  AutopilotSettingsView,
  ValveCommandView,
  ValveLiveCommandView,
  ValveLiveView,
} from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

type ValveLiveDto = components['schemas']['ValveLive'];
type ValveLiveCommandDto = components['schemas']['ValveLiveCommand'];
type ValveCommandDto = components['schemas']['ValveCommand'];
type AutopilotSettingsDto = components['schemas']['AutopilotSettings'];
type AutopilotDecisionDto = components['schemas']['AutopilotDecision'];
type AssistantAnswerDto = components['schemas']['AssistantAnswer'];

/** Checks that a value is one of the known codes; the server sending a new one is a contract break. */
function oneOf<T extends string>(field: string, allowed: readonly T[], value: string): T {
  const found = allowed.find((code) => code === value);
  if (found === undefined) {
    throw new InvalidDtoError(field);
  }
  return found;
}

function toLiveCommand(adapter: ApiDtoAdapter, dto: ValveLiveCommandDto): ValveLiveCommandView {
  return {
    id: dto.id,
    action: oneOf('action', VALVE_ACTIONS, dto.action),
    status: oneOf('status', COMMAND_STATUSES, dto.status),
    origin: oneOf('origin', COMMAND_ORIGINS, dto.origin),
    createdAt: adapter.toTimestamp('created_at', dto.created_at),
    updatedAt: adapter.toTimestamp('updated_at', dto.updated_at),
  };
}

/** One row of GET /valves/live. */
export function toValveLive(adapter: ApiDtoAdapter, dto: ValveLiveDto): ValveLiveView {
  return {
    valveId: dto.valve_id,
    sectorId: dto.sector_id,
    state: oneOf('state', VALVE_STATES, dto.state),
    lastCommand: dto.last_command ? toLiveCommand(adapter, dto.last_command) : null,
  };
}

export function toValveCommand(adapter: ApiDtoAdapter, dto: ValveCommandDto): ValveCommandView {
  return {
    id: dto.id,
    valveId: dto.valve_id,
    action: oneOf('command', VALVE_ACTIONS, dto.command),
    status: oneOf('status', COMMAND_STATUSES, dto.status),
    notBefore: adapter.toTimestamp('not_before', dto.not_before),
    expiresAt: adapter.toTimestamp('expires_at', dto.expires_at),
  };
}

export function toAutopilotSettings(
  adapter: ApiDtoAdapter,
  dto: AutopilotSettingsDto,
): AutopilotSettingsView {
  return {
    mode: oneOf('mode', AUTOPILOT_MODES, dto.mode),
    operatorAbsenceMinutes: dto.operator_absence_minutes,
    reserveFloorPct: dto.reserve_floor_pct,
    updatedAt: dto.updated_at ? adapter.toTimestamp('updated_at', dto.updated_at) : null,
  };
}

export function toAutopilotDecision(
  adapter: ApiDtoAdapter,
  dto: AutopilotDecisionDto,
): AutopilotDecisionView {
  return {
    id: dto.id,
    createdAt: adapter.toTimestamp('created_at', dto.created_at),
    source: oneOf('source', ANSWER_SOURCES, dto.source),
    model: dto.model,
    action: oneOf('action', DECISION_ACTIONS, dto.action),
    valveId: dto.valve_id ?? null,
    reason: dto.reason,
    confidence: dto.confidence,
    status: oneOf('status', DECISION_STATUSES, dto.status),
    decidedBy: dto.decided_by ?? null,
    decidedAt: dto.decided_at ? adapter.toTimestamp('decided_at', dto.decided_at) : null,
    valveCommandId: dto.valve_command_id ?? null,
    statusDetail: dto.status_detail ?? null,
  };
}

export function toAssistantAnswer(
  adapter: ApiDtoAdapter,
  dto: AssistantAnswerDto,
): AssistantAnswerView {
  return {
    source: oneOf('source', ANSWER_SOURCES, dto.source),
    model: dto.model,
    answer: dto.answer,
    generatedAt: adapter.toTimestamp('generated_at', dto.generated_at),
  };
}
