import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../../test/factories/auth';
import { buildProposal, PROPOSAL_ID_TODAY } from '../../test/factories/proposals';
import { buildSessionUser } from '../../test/factories/session';
import { createProposalsBackend } from '../../test/msw/proposalsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

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

    expect(
      await screen.findByText('Hay 8 horas de servicio hoy. Banda del tanque: baja.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Nivel del tanque: 2,1 m')).toBeInTheDocument();
  });

  it('gives an error with a retry when the proposal does not exist', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(detailPath(PROPOSAL_ID_TODAY), { user: board() });

    expect(await screen.findByRole('button', { name: t('common.retry') })).toBeInTheDocument();
  });
});
