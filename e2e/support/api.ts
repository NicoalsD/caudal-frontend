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
  };

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
    if (method === 'GET' && path === '/auth/me') {
      return {
        status: OK,
        body: fixture(this.state.loggedInAs === 'admin' ? 'me-admin' : 'me-operator'),
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
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
