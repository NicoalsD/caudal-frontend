import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Request, Route } from '@playwright/test';

import {
  API_BASE_URL,
  APP_ORIGIN,
  BOARD_ADMIN_USERNAME,
  OPERATOR_USERNAME,
  PUBLIC_SLUG,
  SEED_PASSWORD,
  todayInBogota,
} from './constants';

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url));
const NOT_FOUND = 404;
const UNAUTHORIZED = 401;
const CREATED = 201;
const NO_CONTENT = 204;
const OK = 200;
const HIGH_VALVE_ID = '0190f3a2-0000-7000-8000-0000000000f2';
const SCHOOL_VALVE_ID = '0190f3a2-0000-7000-8000-0000000000f1';
const SCHOOL_SECTOR_ID = '0190f3a2-0000-7000-8000-0000000000d1';
const HIGH_SECTOR_ID = '0190f3a2-0000-7000-8000-0000000000d2';
const COMMAND_ID = '0190f3a2-0000-7000-8000-0000000000e9';
const DECISION_ID = '0190f3a2-0000-7000-8000-0000000000d9';
/** A confirmed command takes these reads: the actuator receives it, then answers. */
const COMMAND_STEPS = ['PENDING', 'DELIVERED', 'ACKED'] as const;
const SECTOR_SEGMENT = 2;
const API_PREFIX = new URL(API_BASE_URL).pathname;

type Json = Record<string, unknown> | unknown[];

/** Reads a plain JSON fixture (the shapes come from src/test/factories). */
export function fixture<T = Json>(name: string): T {
  return JSON.parse(readFileSync(`${FIXTURES_DIR}${name}.json`, 'utf8')) as T;
}

interface ReadingBody {
  readonly id: string;
  readonly gauge_value: number;
  readonly water_appearance_code: string;
  readonly observed_at: string;
}

/** What the fake API has seen and what it currently holds. */
export interface ApiState {
  readonly batches: { readings: ReadingBody[] }[];
  /** Proposal status as the server holds it now (changes with approve and publish). */
  proposalStatus: string;
  proposalLockVersion: number;
  loggedInAs: 'operator' | 'admin' | null;
  /** When true the API is unreachable: requests fail like a lost connection. */
  unreachable: boolean;
  /** Manual valve commands received (POST /valve-commands/manual). */
  valveCommands: { valve_id: string; command: string; manual_reason: string }[];
  /** Pending recommendations the assistant has not been answered yet. */
  decisionStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  /** The command ends in FAILED instead of ACKED when true. */
  failCommands: boolean;
}

/** The list shows summaries: the detail fields of a proposal are left out. */
const PROPOSAL_DETAIL_ONLY_FIELDS = ['items', 'unserved_sectors', 'decisions', 'snapshot_taken'];

function omit(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([key]) => !keys.includes(key)));
}

function errorBody(code: string, message: string): Json {
  return { error: { code, message, request_id: 'e2e-request' } };
}

/**
 * Answers the REST API from plain fixtures. Every request to the API origin goes here, so no
 * test depends on a running backend. CORS is answered for the app origin, with credentials, like
 * the real API (API.md section 1.2).
 */
export class ApiMock {
  readonly state: ApiState = {
    batches: [],
    proposalStatus: 'PENDING_REVIEW',
    proposalLockVersion: 0,
    loggedInAs: null,
    unreachable: false,
    valveCommands: [],
    decisionStatus: 'PENDING',
    failCommands: false,
  };

  /** Live valves: the state of each one and the step of the command that moves it. */
  private readonly liveStates = new Map<string, 'OPEN' | 'CLOSED'>([
    [SCHOOL_VALVE_ID, 'OPEN'],
    [HIGH_VALVE_ID, 'CLOSED'],
  ]);
  private liveCommand: { valveId: string; action: 'OPEN' | 'CLOSE'; step: number } | null = null;

  private liveValves(): Json {
    const items = [...this.liveStates].map(([valveId, state]) => {
      const command = this.liveCommand?.valveId === valveId ? this.liveCommand : null;
      const status =
        command === null
          ? null
          : (COMMAND_STEPS[Math.min(command.step, COMMAND_STEPS.length - 1)] ?? 'ACKED');
      const failed = status === 'ACKED' && this.state.failCommands;
      return {
        valve_id: valveId,
        sector_id: valveId === SCHOOL_VALVE_ID ? SCHOOL_SECTOR_ID : HIGH_SECTOR_ID,
        state,
        last_command:
          command === null
            ? null
            : {
                id: COMMAND_ID,
                action: command.action,
                status: failed ? 'FAILED' : status,
                origin: 'MANUAL',
                created_at: '2026-11-07T10:00:00Z',
                updated_at: '2026-11-07T10:00:00Z',
              },
      };
    });
    // The valve moves when the command is confirmed; the next read then sees the new state.
    if (this.liveCommand !== null) {
      this.liveCommand.step += 1;
      if (this.liveCommand.step >= COMMAND_STEPS.length - 1 && !this.state.failCommands) {
        this.liveStates.set(
          this.liveCommand.valveId,
          this.liveCommand.action === 'OPEN' ? 'OPEN' : 'CLOSED',
        );
      }
    }
    return { items };
  }

  private answer(request: Request): { status: number; body?: Json } {
    const url = new URL(request.url());
    const path = url.pathname.slice(API_PREFIX.length);
    const method = request.method();
    const proposalMatch =
      /^\/schedule-proposals\/(?<id>[^/]+)(\/(?<action>approve|publish))?$/.exec(path);
    const proposalAction = proposalMatch?.groups?.action;

    if (method === 'POST' && path === '/auth/login') {
      const body = request.postDataJSON() as { username: string; password: string };
      if (body.password !== SEED_PASSWORD) {
        return { status: UNAUTHORIZED, body: errorBody('INVALID_CREDENTIALS', 'Credenciales') };
      }
      if (body.username === OPERATOR_USERNAME) {
        this.state.loggedInAs = 'operator';
        return { status: OK, body: fixture('login-operator') };
      }
      if (body.username === BOARD_ADMIN_USERNAME) {
        this.state.loggedInAs = 'admin';
        return { status: OK, body: fixture('login-admin') };
      }
      return { status: UNAUTHORIZED, body: errorBody('INVALID_CREDENTIALS', 'Credenciales') };
    }
    if (method === 'POST' && path === '/auth/refresh') {
      if (this.state.loggedInAs === null) {
        return { status: UNAUTHORIZED, body: errorBody('UNAUTHORIZED', 'Sin sesión') };
      }
      const login = fixture<Record<string, unknown>>(
        this.state.loggedInAs === 'operator' ? 'login-operator' : 'login-admin',
      );
      return { status: OK, body: omit(login, ['user']) };
    }
    if (method === 'GET' && path === '/auth/current-user') {
      return {
        status: OK,
        body: fixture(
          this.state.loggedInAs === 'admin' ? 'current-user-admin' : 'current-user-operator',
        ),
      };
    }
    if (method === 'POST' && path === '/auth/logout') {
      this.state.loggedInAs = null;
      return { status: NO_CONTENT };
    }
    if (method === 'GET' && path === '/meta/constraints') {
      return { status: OK, body: fixture('constraints') };
    }
    if (method === 'GET' && path === '/catalogs/WATER_APPEARANCE') {
      return { status: OK, body: fixture('catalog-water-appearance') };
    }
    if (method === 'GET' && path === '/catalogs/DAMAGE_CATEGORY') {
      return { status: OK, body: fixture('catalog-damage-category') };
    }
    if (method === 'GET' && path === '/rule-sets/current') {
      return { status: OK, body: fixture('rule-set-current') };
    }
    if (method === 'GET' && /^\/sectors\/[^/]+\/valves$/.test(path)) {
      const sectorId = path.split('/')[SECTOR_SEGMENT] ?? '';
      return {
        status: OK,
        body: { items: fixture<Record<string, unknown[]>>('valves-by-sector')[sectorId] ?? [] },
      };
    }
    if (method === 'GET' && path === '/valves/live') {
      return { status: OK, body: this.liveValves() };
    }
    if (method === 'POST' && path === '/valve-commands/manual') {
      const body = request.postDataJSON() as {
        valve_id: string;
        command: 'OPEN' | 'CLOSE';
        manual_reason: string;
        not_before: string;
        expires_at: string;
      };
      this.state.valveCommands.push(body);
      this.liveCommand = { valveId: body.valve_id, action: body.command, step: 0 };
      return {
        status: CREATED,
        body: {
          id: COMMAND_ID,
          valve_id: body.valve_id,
          command: body.command,
          status: 'PENDING',
          not_before: body.not_before,
          expires_at: body.expires_at,
        },
      };
    }
    if (method === 'GET' && path === '/autopilot/settings') {
      return {
        status: OK,
        body: {
          mode: 'ASSISTED',
          operator_absence_minutes: 30,
          reserve_floor_pct: 25,
          updated_at: '2026-11-07T10:00:00Z',
        },
      };
    }
    if (method === 'GET' && path === '/autopilot/decisions') {
      const pending = this.state.decisionStatus === 'PENDING';
      return {
        status: OK,
        body: {
          items: pending
            ? [
                {
                  id: DECISION_ID,
                  created_at: '2026-11-07T10:00:00Z',
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
                },
              ]
            : [],
        },
      };
    }
    if (method === 'POST' && /^\/autopilot\/decisions\/[^/]+\/(accept|reject)$/.test(path)) {
      const accepted = path.endsWith('/accept');
      this.state.decisionStatus = accepted ? 'ACCEPTED' : 'REJECTED';
      return {
        status: OK,
        body: {
          id: DECISION_ID,
          created_at: '2026-11-07T10:00:00Z',
          source: 'RULES',
          model: 'rules-v1',
          action: 'OPEN',
          valve_id: HIGH_VALVE_ID,
          reason: 'El tanque está alto.',
          confidence: 0.8,
          status: accepted ? 'ACCEPTED' : 'REJECTED',
          decided_by: null,
          decided_at: null,
          valve_command_id: null,
        },
      };
    }
    if (method === 'POST' && path === '/assistant/ask') {
      return {
        status: OK,
        body: {
          source: 'RULES',
          model: 'rules-v1',
          answer: 'El tanque alcanza para dos turnos más.',
          generated_at: '2026-11-07T10:00:00Z',
        },
      };
    }
    if (method === 'POST' && path === '/autopilot/run') {
      return { status: OK, body: { items: [] } };
    }
    if (method === 'GET' && path === '/reports') {
      return {
        status: OK,
        body: {
          from: '2026-10-09T05:00:00Z',
          to: '2026-11-08T05:00:00Z',
          aggregates: {
            levels: { readings: 3, min_level: 1.2, max_level: 2.2, avg_level: 1.7 },
            shifts_by_sector: [
              {
                sector: 'Sector Alto',
                planned: 2,
                planned_hours: 4,
                completed: 1,
                partial: 0,
                not_executed: 1,
              },
            ],
            valve_commands: [{ origin: 'MANUAL', status: 'ACKED', total: 1 }],
            autopilot_decisions: [{ source: 'RULES', action: 'OPEN', status: 'EXPIRED', total: 2 }],
            incidents: [],
            anomalies: [],
          },
        },
      };
    }
    if (method === 'POST' && path === '/reports/narrative') {
      return {
        status: OK,
        body: {
          source: 'RULES',
          model: 'rules-v1',
          generated_at: '2026-11-08T10:00:00Z',
          title: 'Reporte del periodo',
          summary: 'El tanque se mantuvo estable.',
          findings: [],
          recommendations: [],
          markdown: '# Reporte\n\nEl tanque se mantuvo **estable**.\n\n- Un hallazgo',
        },
      };
    }
    if (method === 'GET' && path === '/devices') {
      return { status: OK, body: { items: [], next_cursor: null } };
    }
    if (method === 'GET' && path === '/anomalies') {
      return { status: OK, body: { items: [], next_cursor: null } };
    }
    if (method === 'GET' && path === '/tanks') {
      return { status: OK, body: fixture('tanks') };
    }
    if (method === 'GET' && path === '/sectors') {
      return { status: OK, body: fixture('sectors') };
    }
    if (method === 'GET' && /^\/tanks\/[^/]+\/status$/.test(path)) {
      return { status: OK, body: fixture('tank-status') };
    }
    if (method === 'GET' && /^\/tanks\/[^/]+\/forecasts\/latest$/.test(path)) {
      return { status: OK, body: fixture('forecast-latest') };
    }
    if (method === 'POST' && path === '/readings/batch') {
      const body = request.postDataJSON() as {
        sync_batch_id: string;
        readings: ReadingBody[];
      };
      this.state.batches.push({ readings: body.readings });
      return {
        status: OK,
        body: {
          sync_batch_id: body.sync_batch_id,
          idempotent_replay: false,
          items_received: body.readings.length,
          results: body.readings.map((reading) => ({ id: reading.id, status: 'ACCEPTED' })),
        },
      };
    }
    if (method === 'GET' && path === '/schedule-proposals') {
      return { status: OK, body: { items: [this.proposalSummary()], next_cursor: null } };
    }
    if (method === 'GET' && proposalMatch !== null && proposalAction === undefined) {
      return { status: OK, body: this.proposal() };
    }
    if (method === 'POST' && proposalAction === 'approve') {
      this.state.proposalStatus = 'APPROVED';
      this.state.proposalLockVersion += 1;
      return { status: OK, body: this.proposal() };
    }
    if (method === 'POST' && proposalAction === 'publish') {
      this.state.proposalStatus = 'PUBLISHED';
      this.state.proposalLockVersion += 1;
      return {
        status: CREATED,
        body: {
          id: '0190f3a2-7777-7000-8000-000000000001',
          proposal_id: proposalMatch?.groups?.id,
          published_at: new Date().toISOString(),
          whatsapp_text: 'Horario publicado.',
          poster_sha256: null,
        },
      };
    }
    if (method === 'GET' && new RegExp(`^/public/${PUBLIC_SLUG}/schedule$`).test(path)) {
      return { status: OK, body: fixture('public-schedule') };
    }
    if (method === 'GET' && /^\/public\/[^/]+\/schedule$/.test(path)) {
      return { status: OK, body: fixture('public-schedule') };
    }
    return { status: NOT_FOUND, body: errorBody('NOT_FOUND', 'No encontrado') };
  }

  private proposalSummary(): Json {
    return omit(this.proposal(), PROPOSAL_DETAIL_ONLY_FIELDS);
  }

  private proposal(): Record<string, unknown> {
    return {
      ...fixture<Record<string, unknown>>('proposal'),
      service_date: todayInBogota(),
      status: this.state.proposalStatus,
      lock_version: this.state.proposalLockVersion,
    };
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const headers = {
      'access-control-allow-origin': APP_ORIGIN,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'content-type, authorization, x-requested-with',
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: NO_CONTENT, headers });
      return;
    }
    if (this.state.unreachable) {
      await route.abort('internetdisconnected');
      return;
    }
    const { status, body } = this.answer(request);
    if (body === undefined) {
      await route.fulfill({ status, headers });
      return;
    }
    await route.fulfill({
      status,
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  /** Installs the mock on a context, so pages and their new tabs all reach it. */
  async install(context: BrowserContext): Promise<void> {
    await context.route(`${API_BASE_URL}/**`, (route) => this.handle(route));
  }

  /** The app's own origin: answers with the production CSP from vercel.json (see fixtures.ts). */
  async installCsp(context: BrowserContext, csp: string): Promise<void> {
    await context.route(`${APP_ORIGIN}/**`, async (route) => {
      const response = await route.fetch();
      // A navigation can cancel a request while it is in flight: then there is nothing to answer.
      await route
        .fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } })
        .catch(() => undefined);
    });
  }
}

/** Makes the page lose and regain the network, both for the browser and for the fake API. */
export async function setConnection(
  context: BrowserContext,
  mock: ApiMock,
  online: boolean,
): Promise<void> {
  mock.state.unreachable = !online;
  await context.setOffline(!online);
}
