import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import {
  ACTIVE_RULE_SET_ID,
  buildDraft,
  buildRuleSet,
  DRAFT_RULE_SET_ID,
} from '../../test/factories/rules';
import type { RuleBandDto } from '../../test/factories/rules';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const V1_ID = '0190f3a2-0000-7000-8000-0000000000b1';
const V2_ID = '0190f3a2-0000-7000-8000-0000000000b2';
const INTERNAL_ERROR_STATUS = 500;
const HOURS_CURRENT = 6;
const HOURS_PREVIOUS = 8;
const HOURS_FIRST = 4;
const VERSION_FIRST = '1';
const VERSION_CURRENT = '3';
const FIRST_ROW = 1;
const DRAFT_VERSION = '4';

const reader = () => buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['RULESET_VIEW'] });

/** A version with only the low band, so that the hours are the only thing that can differ. */
function lowBand(hours: number): RuleBandDto[] {
  return [
    {
      band: 'LOW',
      min_level: 1.5,
      max_level: 3.5,
      daily_service_hours: hours,
      priority_only: false,
    },
  ];
}

const VERSIONS = {
  items: [
    {
      id: ACTIVE_RULE_SET_ID,
      version: 3,
      status: 'ACTIVE',
      valid_from: '2026-10-01T08:00:00-05:00',
      valid_to: null,
      activated_at: '2026-10-01T08:00:00-05:00',
      based_on_rule_set_id: V2_ID,
    },
    {
      id: V2_ID,
      version: 2,
      status: 'SUPERSEDED',
      valid_from: '2026-09-01T08:00:00-05:00',
      valid_to: '2026-10-01T08:00:00-05:00',
      activated_at: '2026-09-01T08:00:00-05:00',
      based_on_rule_set_id: V1_ID,
    },
    {
      id: V1_ID,
      version: 1,
      status: 'SUPERSEDED',
      valid_from: '2026-08-01T08:00:00-05:00',
      valid_to: '2026-09-01T08:00:00-05:00',
      activated_at: '2026-08-01T08:00:00-05:00',
      based_on_rule_set_id: null,
    },
    {
      id: DRAFT_RULE_SET_ID,
      version: 4,
      status: 'DRAFT',
      valid_from: null,
      valid_to: null,
      activated_at: null,
      based_on_rule_set_id: ACTIVE_RULE_SET_ID,
    },
  ],
};

function serveVersions(hoursByVersion: Readonly<Record<string, number>> = {}) {
  const details = [
    buildRuleSet({
      id: ACTIVE_RULE_SET_ID,
      version: 3,
      status: 'ACTIVE',
      change_reason: 'Se sube la reserva por la temporada seca.',
      bands: lowBand(hoursByVersion[ACTIVE_RULE_SET_ID] ?? HOURS_CURRENT),
      sectors: [],
      valve_order: [],
      operating_windows: [],
    }),
    buildRuleSet({
      id: V2_ID,
      version: 2,
      status: 'SUPERSEDED',
      change_reason: 'Ajuste de horas por el sector alto.',
      bands: lowBand(hoursByVersion[V2_ID] ?? HOURS_PREVIOUS),
      sectors: [],
      valve_order: [],
      operating_windows: [],
    }),
    buildRuleSet({
      id: V1_ID,
      version: 1,
      status: 'SUPERSEDED',
      change_reason: null,
      bands: lowBand(hoursByVersion[V1_ID] ?? HOURS_FIRST),
      sectors: [],
      valve_order: [],
      operating_windows: [],
    }),
  ];
  server.use(
    http.get(apiUrl('/rule-sets'), () => HttpResponse.json(VERSIONS)),
    ...details.map((detail) =>
      http.get(apiUrl(`/rule-sets/${detail.id}`), () => HttpResponse.json(detail)),
    ),
  );
}

function renderHistory(id = ACTIVE_RULE_SET_ID) {
  return renderApp(ROUTE_PATHS.board.ruleHistory.replace(':id', id), { user: reader() });
}

function comparisonTable() {
  return screen.findByRole('table', { name: t('ruleHistory.diffTitle') });
}

describe('RuleHistoryPage (S17)', () => {
  it('lists the versions in force, newest first, with the reason of each, and no draft', async () => {
    serveVersions();
    renderHistory();

    const list = await screen.findByRole('list', { name: t('ruleHistory.versionsTitle') });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(VERSIONS.items.length - 1);
    expect(items[FIRST_ROW - 1]).toHaveTextContent(
      t('rules.versionLine', { version: VERSION_CURRENT }),
    );
    expect(items[FIRST_ROW - 1]).toHaveTextContent('Se sube la reserva por la temporada seca.');
    expect(items[FIRST_ROW]).toHaveTextContent('Ajuste de horas por el sector alto.');
    expect(items[FIRST_ROW + 1]).toHaveTextContent(t('ruleHistory.noReason'));
    expect(
      screen.queryByText(t('rules.versionLine', { version: DRAFT_VERSION })),
    ).not.toBeInTheDocument();
  });

  it('compares the chosen version with the one before it, in plain words', async () => {
    serveVersions();
    renderHistory();

    const table = await comparisonTable();
    const row = within(table).getAllByRole('row')[FIRST_ROW];
    expect(row).toHaveTextContent(t('ruleHistory.bandHours', { band: t('rules.band.low') }));
    expect(
      within(row!).getByText(t('ruleHistory.hours', { value: String(HOURS_PREVIOUS) })),
    ).toBeVisible();
    expect(
      within(row!).getByText(t('ruleHistory.hours', { value: String(HOURS_CURRENT) })),
    ).toBeVisible();
  });

  it('recalculates the differences when another version is chosen before', async () => {
    serveVersions();
    renderHistory();
    await comparisonTable();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /^Antes/ }),
      t('rules.versionLine', { version: VERSION_FIRST }),
    );

    const table = await comparisonTable();
    expect(
      within(table).getByText(t('ruleHistory.hours', { value: String(HOURS_FIRST) })),
    ).toBeVisible();
    expect(
      within(table).queryByText(t('ruleHistory.hours', { value: String(HOURS_PREVIOUS) })),
    ).not.toBeInTheDocument();
  });

  it('says so when the two chosen versions are the same', async () => {
    serveVersions();
    renderHistory();
    await comparisonTable();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /^Antes/ }),
      t('rules.versionLine', { version: VERSION_CURRENT }),
    );

    expect(await screen.findByText(t('ruleHistory.noChanges'))).toBeVisible();
  });

  it('says there is nothing before the first version', async () => {
    serveVersions();
    renderHistory(V1_ID);

    expect(await screen.findByText(t('ruleHistory.firstVersion'))).toBeVisible();
  });

  it('shows the empty state when no version has been in force yet', async () => {
    server.use(http.get(apiUrl('/rule-sets'), () => HttpResponse.json({ items: [] })));
    renderHistory();

    expect(await screen.findByText(t('ruleHistory.empty'))).toBeVisible();
  });

  it('offers to retry when the versions cannot be read', async () => {
    server.use(
      http.get(apiUrl('/rule-sets'), () => errorResponse(INTERNAL_ERROR_STATUS, 'INTERNAL_ERROR')),
    );
    renderHistory();

    expect(await screen.findByRole('button', { name: t('rules.retry') })).toBeVisible();
  });

  it('is reached from the draft page and the rules page', async () => {
    server.use(
      http.get(apiUrl(`/rule-sets/${DRAFT_RULE_SET_ID}`), () => HttpResponse.json(buildDraft())),
    );
    renderApp(ROUTE_PATHS.board.ruleDetail.replace(':id', DRAFT_RULE_SET_ID), { user: reader() });

    const link = await screen.findByRole('link', { name: t('rules.viewHistory') });
    expect(link).toHaveAttribute(
      'href',
      ROUTE_PATHS.board.ruleHistory.replace(':id', DRAFT_RULE_SET_ID),
    );
  });
});
