import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { buildSessionUser } from '../../test/factories/session';
import {
  ACTIVE_RULE_SET_ID,
  buildDraft,
  buildRuleSet,
  DRAFT_RULE_SET_ID,
} from '../../test/factories/rules';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createRulesBackend } from '../../test/msw/rulesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const HEADER_ROWS = 1;
const BAND_COLUMNS = 5;
const admin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    permissions: ['RULESET_VIEW', 'RULESET_DRAFT', 'RULESET_ACTIVATE'],
  });
const reader = () => buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['RULESET_VIEW'] });

describe('RulesPage: rules in force', () => {
  it('shows the version, the date in Bogota and the gauge range the server sent', async () => {
    server.use(
      http.get(apiUrl('/rule-sets/current'), () =>
        HttpResponse.json(buildRuleSet({ gauge: { min: 0, max: 8, step: 0.01 }, version: 7 })),
      ),
    );
    renderApp(ROUTE_PATHS.board.rules, { user: admin() });

    expect(await screen.findByText(/Versión 7/)).toBeInTheDocument();
    expect(screen.getByText(/1 de oct de 2026/)).toBeInTheDocument();
    expect(screen.getByText(t('rules.gaugeRange', { min: '0', max: '8' }))).toBeInTheDocument();
  });

  it('lists the bands from the highest to the lowest with decimal commas', async () => {
    renderApp(ROUTE_PATHS.board.rules, { user: reader() });

    const table = await screen.findByRole('table', { name: t('rules.bandsCaption') });
    const rows = within(table).getAllByRole('row').slice(HEADER_ROWS);
    expect(
      rows.map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ),
    ).toEqual([
      ['3,5', '5', '16', t('rules.no')],
      ['1,5', '3,5', '8', t('rules.no')],
      ['0', '1,5', '3', t('rules.yes')],
    ]);
    expect(
      within(table).getByRole('rowheader', { name: t('rules.band.critical') }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(BAND_COLUMNS);
  });

  it('shows what the server says and nothing from the code (changed hours and windows)', async () => {
    server.use(
      http.get(apiUrl('/rule-sets/current'), () =>
        HttpResponse.json(
          buildRuleSet({
            max_shift_hours: 6,
            reserve_level: 1.2,
            operating_windows: [
              { day_of_week: 6, start_time: '06:30:00', end_time: '12:00:00' },
              { day_of_week: null, start_time: '05:00', end_time: '21:00' },
            ],
          }),
        ),
      ),
    );
    renderApp(ROUTE_PATHS.board.rules, { user: reader() });

    const reserve = await screen.findByText(t('rules.reserveLevel'));
    expect(reserve.nextElementSibling).toHaveTextContent('1,2');
    expect(screen.getByText(t('rules.maxShiftHours')).nextElementSibling).toHaveTextContent('6');
    expect(screen.getByText(t('rules.day.all')).nextElementSibling).toHaveTextContent(
      '05:00 a 21:00',
    );
    expect(screen.getByText(t('rules.day.d6')).nextElementSibling).toHaveTextContent(
      '06:30 a 12:00',
    );
  });

  it('says so when there are no active rules', async () => {
    server.use(
      http.get(apiUrl('/rule-sets/current'), () => errorResponse(STATUS.notFound, 'NOT_FOUND')),
    );
    renderApp(ROUTE_PATHS.board.rules, { user: reader() });

    expect(await screen.findByText(t('rules.noActiveRules'))).toBeInTheDocument();
  });

  it('shows the support code of a server failure and can retry', async () => {
    let calls = 0;
    server.use(
      http.get(apiUrl('/rule-sets/current'), () => {
        calls += 1;
        return calls === 1
          ? errorResponse(STATUS.badRequest, 'INTERNAL_ERROR', { requestId: 'req-123' })
          : HttpResponse.json(buildRuleSet({ version: 9 }));
      }),
    );
    renderApp(ROUTE_PATHS.board.rules, { user: reader() });

    expect(await screen.findByRole('alert')).toHaveTextContent('req-123');
    await userEvent.setup().click(screen.getByRole('button', { name: t('rules.retry') }));

    expect(await screen.findByText(/Versión 9/)).toBeInTheDocument();
  });

  it('keeps the cache of the rules apart per aqueduct', async () => {
    const { services } = renderApp(ROUTE_PATHS.board.rules, { user: reader() });
    await screen.findByRole('table');

    const keys = services.queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toContainEqual(['aqueduct', reader().aqueductId, 'rule-sets', 'current']);
  });
});

describe('RulesPage: the draft', () => {
  it('lets someone with RULESET_DRAFT create the draft and opens it', async () => {
    const backend = createRulesBackend();
    server.use(...backend.handlers);
    const { router } = renderApp(ROUTE_PATHS.board.rules, { user: admin() });

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: t('rules.createDraft') }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/junta/reglas/${DRAFT_RULE_SET_ID}`);
    });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: t('rules.draftPageTitle', { version: '4' }),
      }),
    ).toBeInTheDocument();
    expect(backend.calls.creations).toBe(1);
  });

  it('offers no button to someone without the permission', async () => {
    renderApp(ROUTE_PATHS.board.rules, { user: reader() });

    expect(await screen.findByText(t('rules.noDraftReadOnly'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('rules.createDraft') })).not.toBeInTheDocument();
  });

  it('links to the open draft instead of offering to create another', async () => {
    server.use(...createRulesBackend({ draft: buildDraft() }).handlers);
    renderApp(ROUTE_PATHS.board.rules, { user: admin() });

    const link = await screen.findByRole('link', { name: t('rules.editDraft') });
    expect(link).toHaveAttribute('href', `/junta/reglas/${DRAFT_RULE_SET_ID}`);
    expect(screen.getByText(t('rules.draftOpen', { version: '4' }))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('rules.createDraft') })).not.toBeInTheDocument();
  });

  it('shows the server error if the draft cannot be created', async () => {
    server.use(http.post(apiUrl('/rule-sets'), () => errorResponse(STATUS.conflict, 'CONFLICT')));
    renderApp(ROUTE_PATHS.board.rules, { user: admin() });

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: t('rules.createDraft') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.conflict'));
  });
});

describe('RuleDraftPage: one version', () => {
  it('shows an active version as read-only', async () => {
    server.use(...createRulesBackend().handlers);
    renderApp(`/junta/reglas/${ACTIVE_RULE_SET_ID}`, { user: reader() });

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: t('rules.versionPageTitle', { version: '3' }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('rules.notEditable'))).toBeInTheDocument();
  });

  it('reports a version that does not exist', async () => {
    server.use(...createRulesBackend().handlers);
    renderApp('/junta/reglas/no-existe', { user: reader() });

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.notFound'));
  });
});
