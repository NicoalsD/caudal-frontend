import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Page, Route, TestInfo } from '@playwright/test';

import { strings } from '../../src/i18n/es';
import {
  APP_ORIGIN,
  API_BASE_URL,
  BOARD_ADMIN_USERNAME,
  OPERATOR_USERNAME,
  PUBLIC_SLUG,
  SEED_PASSWORD,
  todayInBogota,
} from '../support/constants';
import { type ApiMock, fixture, setConnection } from '../support/api';
import { expect, test } from '../support/fixtures';
import { goToNavLink, signIn } from '../support/session';

/**
 * Real screens of the app for the landing's phone and panel frames. Each test captures the viewport
 * (not the full page) in both color schemes; see playwright.capture.config.ts.
 */

const SCREENS_DIR = fileURLToPath(new URL('../../src/assets/landing/screens/', import.meta.url));
const API_PREFIX = new URL(API_BASE_URL).pathname;
const HTTP_OK = 200;
const LOADING_TEXT = /^Cargando/;
const SPINNER_SELECTOR = '[class*="spinner" i]';
const BUSY_SELECTOR = '[aria-busy="true"]';

const OPERATOR_HOME = /\/operador\/inicio$/;
const NEW_READING = /\/operador\/lectura\/nueva$/;
const PENDING = /\/operador\/pendientes$/;
const BOARD_TANK = /\/junta\/tanque$/;
const PROPOSAL_DETAIL = /\/junta\/propuestas\/[^/]+$/;
const GAUGE_VALUE = '2,1';
const APPEARANCE_NORMAL = 'Normal';

/** The landing's numbers: tank level 2.1 m and four sectors with their hours. */
const LANDING_LEVEL = 2.1;
const LANDING_BAND = 'LOW';
/** Hours of water the landing's day hands out: 3 + 4 + 3 + 1. */
const LANDING_HOURS = 11;
const LANDING_SECTORS = {
  escuela: '0190f3a2-0000-7000-8000-0000000000d1',
  alto: '0190f3a2-0000-7000-8000-0000000000d2',
  loma: '0190f3a2-0000-7000-8000-0000000000d3',
  llano: '0190f3a2-0000-7000-8000-0000000000d4',
} as const;

type Json = Record<string, unknown>;

/** Turn order of the landing's day; a sector's sequence is its place here. */
const SERVICE_ORDER: readonly string[] = [
  LANDING_SECTORS.escuela,
  LANDING_SECTORS.alto,
  LANDING_SECTORS.loma,
  LANDING_SECTORS.llano,
];

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': APP_ORIGIN,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type, authorization, x-requested-with',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
}

async function fulfillJson(route: Route, body: Json | Json[]): Promise<void> {
  await route.fulfill({
    status: HTTP_OK,
    headers: { ...corsHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** The sector list, the tank status, today's proposal and the public schedule, with landing data. */
function landingSectors(): Json {
  const households = { escuela: 12, alto: 30, loma: 25, llano: 18 } as const;
  const sector = (id: string, name: string, code: string, count: number): Json => ({
    id,
    code,
    name,
    parent_sector_id: null,
    households_count: count,
    is_active: true,
  });
  return {
    items: [
      sector(LANDING_SECTORS.escuela, 'Escuela', 'ESCUELA', households.escuela),
      sector(LANDING_SECTORS.alto, 'El Alto', 'ALTO', households.alto),
      sector(LANDING_SECTORS.loma, 'La Loma', 'LOMA', households.loma),
      sector(LANDING_SECTORS.llano, 'El Llano', 'LLANO', households.llano),
    ],
  };
}

function landingTankStatus(): Json {
  const status = fixture<Json>('tank-status');
  return {
    ...status,
    level: { ...(status.level as Json), value: LANDING_LEVEL, hours_ago: 1 },
    band: LANDING_BAND,
  };
}

/** Today's proposal: Escuela 3 h, El Alto 4 h, La Loma 3 h, El Llano 1 h (from the landing). */
function landingProposal(api: ApiMock): Json {
  const day = todayInBogota();
  const span = (start: string, end: string): { start_at: string; end_at: string } => ({
    start_at: `${day}T${start}:00-05:00`,
    end_at: `${day}T${end}:00-05:00`,
  });
  const proposal = fixture<Json>('proposal');
  const item = (
    id: string,
    sectorId: string,
    span: { start_at: string; end_at: string },
    reasons: Json[],
  ): Json => ({
    id,
    sector_id: sectorId,
    sequence: SERVICE_ORDER.indexOf(sectorId) + 1,
    origin: 'PROPOSED',
    reasons,
    ...span,
  });
  return {
    ...proposal,
    service_date: day,
    available_hours: LANDING_HOURS,
    status: api.state.proposalStatus,
    lock_version: api.state.proposalLockVersion,
    items: [
      item(
        '0190f3a2-9b00-7000-8000-0000000000a1',
        LANDING_SECTORS.escuela,
        span('06:00', '09:00'),
        [
          {
            code: 'PRIORITY_SECTOR',
            params: { sector: 'Escuela', priority_rank: 1 },
            text: 'Escuela es prioritario y recibe turno antes que los demás.',
          },
        ],
      ),
      item('0190f3a2-9b00-7000-8000-0000000000a2', LANDING_SECTORS.alto, span('09:00', '13:00'), [
        {
          code: 'HOURS_WITHOUT_SERVICE',
          params: { sector: 'El Alto', origen: 'CONFIRMED' },
          text: 'El Alto lleva más horas sin servicio que el resto.',
        },
      ]),
      item('0190f3a2-9b00-7000-8000-0000000000a3', LANDING_SECTORS.loma, span('13:00', '16:00'), [
        {
          code: 'HOURS_WITHOUT_SERVICE',
          params: { sector: 'La Loma', origen: 'CONFIRMED' },
          text: 'La Loma sigue en la rotación del día.',
        },
      ]),
      item('0190f3a2-9b00-7000-8000-0000000000a4', LANDING_SECTORS.llano, span('16:00', '17:00'), [
        {
          code: 'HOURS_WITHOUT_SERVICE',
          params: { sector: 'El Llano', origen: 'CONFIRMED' },
          text: 'El Llano recibe la última hora del día.',
        },
      ]),
    ],
  };
}

function landingPublicSchedule(): Json {
  const day = todayInBogota();
  const span = (start: string, end: string): { start_at: string; end_at: string } => ({
    start_at: `${day}T${start}Z`,
    end_at: `${day}T${end}Z`,
  });
  const schedule = fixture<Json>('public-schedule');
  return {
    ...schedule,
    service_date: day,
    items: [
      { sector_name: 'Escuela', ...span('11:00:00', '14:00:00') },
      { sector_name: 'El Alto', ...span('14:00:00', '18:00:00') },
      { sector_name: 'La Loma', ...span('18:00:00', '21:00:00') },
      { sector_name: 'El Llano', ...span('21:00:00', '22:00:00') },
    ],
  };
}

/**
 * Overrides the few reads whose fixture numbers differ from the landing. Registered after the
 * ApiMock, so it answers first; anything it does not own goes on to the mock with route.fallback().
 */
async function applyLandingData(context: BrowserContext, api: ApiMock): Promise<void> {
  const proposalPath = /^\/schedule-proposals\/[^/]+$/;
  const statusPath = /^\/tanks\/[^/]+\/status$/;
  const publicPath = /^\/public\/[^/]+\/schedule$/;
  await context.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice(API_PREFIX.length);
    if (request.method() !== 'GET') {
      await route.fallback();
      return;
    }
    if (api.state.unreachable) {
      await route.abort('internetdisconnected');
      return;
    }
    if (path === '/sectors') {
      await fulfillJson(route, landingSectors());
    } else if (statusPath.test(path)) {
      await fulfillJson(route, landingTankStatus());
    } else if (proposalPath.test(path)) {
      await fulfillJson(route, landingProposal(api));
    } else if (publicPath.test(path)) {
      await fulfillJson(route, landingPublicSchedule());
    } else {
      await route.fallback();
    }
  });
}

/** Waits until nothing is loading or spinning, so the frame never shows a placeholder. */
async function settle(page: Page): Promise<void> {
  await expect(page.getByText(LOADING_TEXT)).toHaveCount(0);
  await expect(page.locator(BUSY_SELECTOR)).toHaveCount(0);
  await expect(page.locator(SPINNER_SELECTOR)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await settle(page);
  // A phone shows a screen from its top: the frame never starts halfway down the page.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${SCREENS_DIR}${name}-${testInfo.project.name}.png`,
    animations: 'disabled',
  });
}

/** Opens the reading form from the operator home, with the water appearance chosen. */
async function fillReading(page: Page): Promise<void> {
  await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, OPERATOR_HOME);
  await page.getByRole('link', { name: strings.home.newReading }).click();
  await expect(page).toHaveURL(NEW_READING);
  await expect(page.getByRole('radio', { name: APPEARANCE_NORMAL })).toBeVisible();
  await page.getByLabel(strings.readings.gaugeLabel).fill(GAUGE_VALUE);
  await page.getByRole('radio', { name: APPEARANCE_NORMAL }).check();
}

/** Opens today's proposal from the board's tank screen, as the board does. */
async function openTodayProposal(page: Page): Promise<void> {
  await signIn(page, BOARD_ADMIN_USERNAME, SEED_PASSWORD, BOARD_TANK);
  await expect(page.getByRole('heading', { name: strings.screens.tankStatus })).toBeVisible();
  await page.getByRole('button', { name: strings.proposals.guide.review }).click();
  await expect(page).toHaveURL(PROPOSAL_DETAIL);
  await expect(page.getByRole('heading', { name: strings.screens.proposalDetail })).toBeVisible();
}

test.describe('Capturas para la landing', () => {
  test.beforeEach(async ({ context, api }) => {
    mkdirSync(SCREENS_DIR, { recursive: true });
    await applyLandingData(context, api);
  });

  test('operator-reading', async ({ page }, testInfo) => {
    await fillReading(page);
    await capture(page, testInfo, 'operator-reading');
  });

  test('operator-offline', async ({ page, context, api }, testInfo) => {
    await fillReading(page);
    await setConnection(context, api, false);
    await page.getByRole('button', { name: strings.readings.submit }).click();
    await expect(page.getByText(strings.readings.savedOffline)).toBeVisible();
    await capture(page, testInfo, 'operator-offline');
  });

  test('operator-pending', async ({ page, context, api }, testInfo) => {
    await fillReading(page);
    await setConnection(context, api, false);
    await page.getByRole('button', { name: strings.readings.submit }).click();
    await expect(page.getByText(strings.readings.savedOffline)).toBeVisible();
    await goToNavLink(page, strings.nav.pending);
    await expect(page).toHaveURL(PENDING);
    await expect(page.getByText(`Nivel ${GAUGE_VALUE}`)).toBeVisible();
    await capture(page, testInfo, 'operator-pending');
  });

  test('board-tank', async ({ page }, testInfo) => {
    await signIn(page, BOARD_ADMIN_USERNAME, SEED_PASSWORD, BOARD_TANK);
    await expect(page.getByRole('heading', { name: strings.screens.tankStatus })).toBeVisible();
    await capture(page, testInfo, 'board-tank');
  });

  test('board-proposal', async ({ page }, testInfo) => {
    await openTodayProposal(page);
    await capture(page, testInfo, 'board-proposal');
  });

  test('board-approve', async ({ page }, testInfo) => {
    await openTodayProposal(page);
    await page.getByRole('button', { name: strings.proposals.actions.approve }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await capture(page, testInfo, 'board-approve');
  });

  test('public-schedule', async ({ page }, testInfo) => {
    await page.goto(`/a/${PUBLIC_SLUG}`);
    await expect(
      page.getByRole('heading', { name: strings.publicSchedule.sectorsHeading }),
    ).toBeVisible();
    await capture(page, testInfo, 'public-schedule');
  });
});
