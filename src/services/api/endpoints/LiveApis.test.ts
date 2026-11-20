import { describe, expect, it } from 'vitest';

import {
  buildAssistantAnswer,
  buildAutopilotSettings,
  buildDecision,
  buildLiveCommand,
  buildValveLive,
  COMMAND_ID,
  HIGH_VALVE_ID,
} from '../../../test/factories/live';
import { FakeHttpClient, okResponse } from '../../../test/fakes/FakeHttpClient';
import { ApiDtoAdapter } from '../adapters/ApiDtoAdapter';
import { InvalidDtoError } from '../adapters/InvalidDtoError';
import { AutopilotApi } from './AutopilotApi';
import { ValvesLiveApi } from './ValvesLiveApi';

const MINUTES = 30;
const FLOOR = 25;
const LIMIT = 20;
const CONFIDENCE = 0.8;
const NOT_BEFORE = new Date('2026-10-14T13:00:00.000Z');
const EXPIRES_AT = new Date('2026-10-14T13:05:00.000Z');

describe('ValvesLiveApi', () => {
  it('reads the live valves and maps state and last command', async () => {
    const http = new FakeHttpClient(
      okResponse({
        items: [
          buildValveLive({
            state: 'OPEN',
            last_command: buildLiveCommand({ status: 'DELIVERED' }),
          }),
          buildValveLive({ state: 'UNKNOWN' }),
        ],
      }),
    );

    const [first, second] = await new ValvesLiveApi(http, new ApiDtoAdapter()).list();

    expect(http.requests[0]).toMatchObject({ method: 'GET', path: '/valves/live' });
    expect(first).toMatchObject({
      valveId: HIGH_VALVE_ID,
      state: 'OPEN',
      lastCommand: { id: COMMAND_ID, action: 'OPEN', status: 'DELIVERED', origin: 'MANUAL' },
    });
    expect(second?.lastCommand).toBeNull();
  });

  it('rejects a state this client does not know', async () => {
    const http = new FakeHttpClient(
      okResponse({ items: [{ ...buildValveLive(), state: 'HALF_OPEN' }] }),
    );

    await expect(new ValvesLiveApi(http, new ApiDtoAdapter()).list()).rejects.toBeInstanceOf(
      InvalidDtoError,
    );
  });

  it('posts a manual command with the reason and the window', async () => {
    const http = new FakeHttpClient(
      okResponse({
        id: COMMAND_ID,
        valve_id: HIGH_VALVE_ID,
        command: 'CLOSE',
        status: 'PENDING',
        not_before: NOT_BEFORE.toISOString(),
        expires_at: EXPIRES_AT.toISOString(),
      }),
    );

    const view = await new ValvesLiveApi(http, new ApiDtoAdapter()).sendManual({
      valveId: HIGH_VALVE_ID,
      action: 'CLOSE',
      reason: 'Fuga visible en el tubo.',
      notBefore: NOT_BEFORE,
      expiresAt: EXPIRES_AT,
    });

    expect(http.requests[0]).toMatchObject({
      method: 'POST',
      path: '/valve-commands/manual',
      body: {
        valve_id: HIGH_VALVE_ID,
        command: 'CLOSE',
        manual_reason: 'Fuga visible en el tubo.',
        not_before: NOT_BEFORE.toISOString(),
        expires_at: EXPIRES_AT.toISOString(),
      },
    });
    expect(view).toMatchObject({ id: COMMAND_ID, action: 'CLOSE', status: 'PENDING' });
  });
});

describe('AutopilotApi', () => {
  const adapter = new ApiDtoAdapter();

  it('reads the settings', async () => {
    const http = new FakeHttpClient(okResponse(buildAutopilotSettings()));

    const view = await new AutopilotApi(http, adapter).getSettings();

    expect(http.requests[0]).toMatchObject({ method: 'GET', path: '/autopilot/settings' });
    expect(view).toMatchObject({
      mode: 'ASSISTED',
      operatorAbsenceMinutes: MINUTES,
      reserveFloorPct: FLOOR,
    });
  });

  it('puts the three settings together', async () => {
    const http = new FakeHttpClient(okResponse(buildAutopilotSettings({ mode: 'MANUAL' })));

    const view = await new AutopilotApi(http, adapter).updateSettings({
      mode: 'MANUAL',
      operatorAbsenceMinutes: MINUTES,
      reserveFloorPct: FLOOR,
    });

    expect(http.requests[0]).toMatchObject({
      method: 'PUT',
      path: '/autopilot/settings',
      body: { mode: 'MANUAL', operator_absence_minutes: MINUTES, reserve_floor_pct: FLOOR },
    });
    expect(view.mode).toBe('MANUAL');
  });

  it('lists the decisions of a status and maps them', async () => {
    const http = new FakeHttpClient(okResponse({ items: [buildDecision()] }));

    const [decision] = await new AutopilotApi(http, adapter).decisions({
      status: 'PENDING',
      limit: LIMIT,
    });

    expect(http.requests[0]).toMatchObject({
      path: '/autopilot/decisions',
      query: { status: 'PENDING', limit: String(LIMIT) },
    });
    expect(decision).toMatchObject({
      action: 'OPEN',
      valveId: HIGH_VALVE_ID,
      confidence: CONFIDENCE,
      source: 'RULES',
      decidedAt: null,
    });
  });

  it('accepts and rejects a decision', async () => {
    const http = new FakeHttpClient(
      okResponse(buildDecision({ status: 'ACCEPTED' })),
      okResponse(buildDecision({ status: 'REJECTED' })),
    );
    const api = new AutopilotApi(http, adapter);

    const accepted = await api.accept('d-1');
    const rejected = await api.reject('d-1', 'No hace falta.');

    expect(http.requests[0]).toMatchObject({
      method: 'POST',
      path: '/autopilot/decisions/d-1/accept',
    });
    expect(http.requests[1]).toMatchObject({
      path: '/autopilot/decisions/d-1/reject',
      body: { reason: 'No hace falta.' },
    });
    expect(accepted.status).toBe('ACCEPTED');
    expect(rejected.status).toBe('REJECTED');
  });

  it('asks the assistant and keeps the source of the answer', async () => {
    const http = new FakeHttpClient(okResponse(buildAssistantAnswer({ source: 'LLM' })));

    const answer = await new AutopilotApi(http, adapter).ask('¿Alcanza el agua?');

    expect(http.requests[0]).toMatchObject({
      method: 'POST',
      path: '/assistant/ask',
      body: { question: '¿Alcanza el agua?' },
    });
    expect(answer).toMatchObject({ source: 'LLM', model: 'rules-v1' });
  });
});
