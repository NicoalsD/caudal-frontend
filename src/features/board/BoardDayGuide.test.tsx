import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { toBogotaDateKey } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../../test/factories/auth';
import { buildProposalSummary } from '../../test/factories/proposals';
import { buildSessionUser } from '../../test/factories/session';
import { createProposalsBackend } from '../../test/msw/proposalsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const board = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: [...PERMISSIONS_BY_ROLE.BOARD_MEMBER] });
const TODAY = toBogotaDateKey(new Date().toISOString());
const GUIDE = () => screen.findByRole('region', { name: t('proposals.guide.heading') });

describe('BoardDayGuide (F088): one next step on the tank screen', () => {
  it('offers to generate today proposal when there is none', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: board() });

    const guide = within(await GUIDE());
    expect(guide.getByRole('button', { name: t('proposals.generate') })).toBeInTheDocument();
    expect(guide.getAllByRole('button')).toHaveLength(1);
  });

  it('asks to review a pending proposal', async () => {
    server.use(...createProposalsBackend([buildProposalSummary({ service_date: TODAY })]).handlers);
    renderApp(ROUTE_PATHS.board.tank, { user: board() });

    const guide = within(await GUIDE());
    expect(guide.getByRole('button', { name: t('proposals.guide.review') })).toBeInTheDocument();
  });

  it('asks to publish an approved proposal', async () => {
    server.use(
      ...createProposalsBackend([
        buildProposalSummary({ service_date: TODAY, status: 'APPROVED', lock_version: 1 }),
      ]).handlers,
    );
    renderApp(ROUTE_PATHS.board.tank, { user: board() });

    const guide = within(await GUIDE());
    expect(guide.getByRole('button', { name: t('proposals.guide.publish') })).toBeInTheDocument();
  });

  it('shows the published schedule with a link to it', async () => {
    server.use(
      ...createProposalsBackend([
        buildProposalSummary({ service_date: TODAY, status: 'PUBLISHED', lock_version: 2 }),
      ]).handlers,
    );
    renderApp(ROUTE_PATHS.board.tank, { user: board() });

    const guide = within(await GUIDE());
    expect(guide.getByText(t('proposals.guide.published'))).toBeInTheDocument();
    expect(guide.getByRole('link', { name: t('proposals.guide.publishedLink') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.board.publication,
    );
  });
});
