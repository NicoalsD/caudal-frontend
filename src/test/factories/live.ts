import type { components } from '../../services/api/schema';
import { SECTOR_HIGH_ID } from './rules';

export type ValveLiveDto = components['schemas']['ValveLive'];
export type ValveLiveCommandDto = components['schemas']['ValveLiveCommand'];
export type DecisionDto = components['schemas']['AutopilotDecision'];
export type AutopilotSettingsDto = components['schemas']['AutopilotSettings'];
export type AssistantAnswerDto = components['schemas']['AssistantAnswer'];

export const SCHOOL_VALVE_ID = '0190f3a2-0000-7000-8000-0000000000f1';
export const HIGH_VALVE_ID = '0190f3a2-0000-7000-8000-0000000000f2';
export { SECTOR_HIGH_ID as HIGH_SECTOR_ID, SECTOR_SCHOOL_ID } from './rules';
export const DECISION_ID = '0190f3a2-0000-7000-8000-0000000000d1';
export const COMMAND_ID = '0190f3a2-0000-7000-8000-0000000000e9';

export function buildValveLive(overrides: Partial<ValveLiveDto> = {}): ValveLiveDto {
  return {
    valve_id: HIGH_VALVE_ID,
    sector_id: SECTOR_HIGH_ID,
    state: 'CLOSED',
    last_command: null,
    ...overrides,
  };
}

export function buildLiveCommand(
  overrides: Partial<ValveLiveCommandDto> = {},
): ValveLiveCommandDto {
  return {
    id: COMMAND_ID,
    action: 'OPEN',
    status: 'PENDING',
    origin: 'MANUAL',
    created_at: '2026-10-14T13:00:00Z',
    updated_at: '2026-10-14T13:00:00Z',
    ...overrides,
  };
}

export function buildDecision(overrides: Partial<DecisionDto> = {}): DecisionDto {
  return {
    id: DECISION_ID,
    created_at: '2026-10-14T13:00:00Z',
    source: 'RULES',
    model: 'rules-v1',
    action: 'OPEN',
    valve_id: HIGH_VALVE_ID,
    reason: 'El tanque está alto y el sector Alto no ha tenido agua hoy.',
    confidence: 0.8,
    status: 'PENDING',
    decided_by: null,
    decided_at: null,
    valve_command_id: null,
    ...overrides,
  };
}

export function buildAutopilotSettings(
  overrides: Partial<AutopilotSettingsDto> = {},
): AutopilotSettingsDto {
  return {
    mode: 'ASSISTED',
    operator_absence_minutes: 30,
    reserve_floor_pct: 25,
    updated_at: '2026-10-14T12:00:00Z',
    ...overrides,
  };
}

export function buildAssistantAnswer(
  overrides: Partial<AssistantAnswerDto> = {},
): AssistantAnswerDto {
  return {
    source: 'RULES',
    model: 'rules-v1',
    answer: 'El tanque alcanza para dos turnos más.',
    generated_at: '2026-10-14T13:00:00Z',
    ...overrides,
  };
}
