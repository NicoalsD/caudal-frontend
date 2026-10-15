import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { toBogotaDateKey } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../../test/factories/auth';
import { buildSessionUser } from '../../test/factories/session';
import {
  buildProposalSummary,
  PROPOSAL_ID_TODAY,
  PROPOSAL_ID_YESTERDAY,
} from '../../test/factories/proposals';
import { apiUrl } from '../../test/msw/apiUrl';
import { createProposalsBackend } from '../../test/msw/proposalsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const board = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: [...PERMISSIONS_BY_ROLE.BOARD_MEMBER] });
const TODAY = toBogotaDateKey(new Date().toISOString());
const YESTERDAY = '2026-10-08';
const OLDER = '2026-10-01';
const OTHERS_COUNT = 2;

describe('ProposalListPage (S13 list)', () => {
  it('shows the proposal of today first, with its status, before the others by date', async () => {
    server.use(
      ...createProposalsBackend([
        buildProposalSummary({
          id: PROPOSAL_ID_YESTERDAY,
          service_date: YESTERDAY,
          status: 'PUBLISHED',
        }),
        buildProposalSummary({
          id: PROPOSAL_ID_TODAY,
          service_date: TODAY,
          status: 'PENDING_REVIEW',
        }),
        buildProposalSummary({
          id: '0190f3a2-9a00-7000-8000-000000000003',
          service_date: OLDER,
          status: 'CLOSED',
        }),
      ]).handlers,
    );
    renderApp(ROUTE_PATHS.board.proposals, { user: board() });

    const today = await screen.findByRole('region', { name: t('proposals.today') });
    expect(within(today).getByText(t('proposals.status.PENDING_REVIEW'))).toBeInTheDocument();
    const others = screen.getByRole('region', { name: t('proposals.others') });
    const items = within(others).getAllByRole('listitem');
    expect(items).toHaveLength(OTHERS_COUNT);
    expect(items[0]).toHaveTextContent(t('proposals.status.PUBLISHED'));
    expect(items[1]).toHaveTextContent(t('proposals.status.CLOSED'));
    expect(screen.queryByRole('button', { name: t('proposals.generate') })).not.toBeInTheDocument();
  });

  it('offers the main action to generate today proposal when there is none', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.proposals, { user: board() });

    const generate = await screen.findByRole('button', { name: t('proposals.generate') });
    expect(generate).toBeEnabled();
    await userEvent.click(generate);

    expect(await screen.findByText(t('proposals.generated'))).toBeInTheDocument();
    const today = screen.getByRole('region', { name: t('proposals.today') });
    expect(within(today).getByText(t('proposals.status.PENDING_REVIEW'))).toBeInTheDocument();
  });

  it('explains an empty list in plain words', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.proposals, { user: board() });

    expect(await screen.findByText(t('proposals.todayEmpty'))).toBeInTheDocument();
    expect(screen.getByText(t('proposals.emptyList'))).toBeInTheDocument();
  });

  it('shows the loading text while the list is read', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.proposals, { user: board() });

    expect(screen.getByRole('status')).toHaveTextContent(t('proposals.loading'));
    await screen.findByRole('button', { name: t('proposals.generate') });
  });

  it('shows an error with a retry when the list cannot be read', async () => {
    server.use(
      http.get(apiUrl('/schedule-proposals'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', request_id: 'r' },
          { status: 500 },
        ),
      ),
    );
    renderApp(ROUTE_PATHS.board.proposals, { user: board() });

    expect(await screen.findByRole('button', { name: t('common.retry') })).toBeInTheDocument();
  });
});
