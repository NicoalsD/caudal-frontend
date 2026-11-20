import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../../test/factories/auth';
import { buildProposal, PROPOSAL_ID_TODAY } from '../../test/factories/proposals';
import { SECTOR_LOW_ID } from '../../test/factories/rules';
import { buildSessionUser } from '../../test/factories/session';
import { createProposalsBackend } from '../../test/msw/proposalsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const UNSERVED_ROWS = 2;
const board = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: [...PERMISSIONS_BY_ROLE.BOARD_MEMBER] });
const detailPath = (id: string) => ROUTE_PATHS.board.proposalDetail.replace(':id', id);

describe('ProposalDetailPage (S13 detail, explanations)', () => {
  it('lists each shift with its sector, 12 h times, hours and reasons in words', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const school = (
      await screen.findByRole('heading', { level: 3, name: 'Sector Escuela' })
    ).closest('li');
    expect(school).not.toBeNull();
    const shift = within(school as HTMLElement);
    expect(shift.getByText('6:00 a. m. a 9:00 a. m.')).toBeInTheDocument();
    expect(shift.getByText('3 horas')).toBeInTheDocument();
    expect(
      shift.getByText('Escuela es prioritario y recibe turno antes que los demás.'),
    ).toBeInTheDocument();

    const high = within(
      screen.getByRole('heading', { level: 3, name: 'Sector Alto' }).closest('li') as HTMLElement,
    );
    expect(high.getByText('8 horas')).toBeInTheDocument();
    expect(high.getByText('Alto lleva 38 horas sin servicio.')).toBeInTheDocument();
  });

  it('marks the priority sectors of the active rules', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const school = (
      await screen.findByRole('heading', { level: 3, name: 'Sector Escuela' })
    ).closest('li') as HTMLElement;
    expect(within(school).getByText(t('proposals.prioritySector'))).toBeInTheDocument();
    const high = screen.getByRole('heading', { level: 3, name: 'Sector Alto' }).closest('li');
    expect(within(high as HTMLElement).queryByText(t('proposals.prioritySector'))).toBeNull();
  });

  it('shows the hours available for the day and the tank band that produced them', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const hours = (await screen.findByText(t('proposals.summary.hours'))).closest('div');
    expect(within(hours as HTMLElement).getByText('16 horas')).toBeInTheDocument();
    const band = screen.getByText(t('proposals.summary.band')).closest('div');
    expect(within(band as HTMLElement).getByText('baja')).toBeInTheDocument();
    expect(screen.getByText('Nivel del tanque: 2,1 m')).toBeInTheDocument();
  });

  it('puts approve first, then modify and reject as secondary actions', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const decisions = await screen.findByRole('region', { name: t('proposals.decideTitle') });
    const names = within(decisions)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toEqual([
      t('proposals.actions.approve'),
      t('proposals.actions.modify'),
      t('proposals.actions.reject'),
    ]);
  });

  it('keeps the reasons of a shift behind a disclosure', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const school = (
      await screen.findByRole('heading', { level: 3, name: 'Sector Escuela' })
    ).closest('li') as HTMLElement;
    const disclosure = school.querySelector('details');
    expect(disclosure).not.toBeNull();
    expect(
      within(disclosure as HTMLElement).getByText(
        'Escuela es prioritario y recibe turno antes que los demás.',
      ),
    ).toBeInTheDocument();
  });

  it('gives an error with a retry when the proposal does not exist', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    expect(await screen.findByRole('button', { name: t('common.retry') })).toBeInTheDocument();
  });

  it('lists the sectors without a shift today, with the reason in plain words', async () => {
    server.use(
      ...createProposalsBackend([
        buildProposal({
          unserved_sectors: [
            { sector_id: SECTOR_LOW_ID, reason: 'NO_BUDGET' },
            { sector_id: SECTOR_LOW_ID, reason: 'CODIGO_NUEVO' },
          ],
        }),
      ]).handlers,
    );
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    const section = await screen.findByRole('region', { name: t('proposals.unserved.title') });
    expect(
      within(section).getAllByText(
        'No alcanza el agua disponible. El agua se usó en los sectores anteriores de la lista.',
      ),
    ).toHaveLength(1);
    expect(within(section).getAllByText('Sector Bajo')).toHaveLength(UNSERVED_ROWS);
    expect(within(section).getByText(t('proposals.unserved.unknown'))).toBeInTheDocument();
  });
});
