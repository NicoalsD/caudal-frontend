import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
const detailPath = ROUTE_PATHS.board.proposalDetail.replace(':id', PROPOSAL_ID_TODAY);
const LONG_REASON = 'El sector escuela tiene una clase especial ese día.';

describe('proposal decisions (S13 approve, reject; S15 publish)', () => {
  it('asks for confirmation with a summary, approves, and goes to the publication', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath, { user: board() });

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.approve') }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/2 sectores, 11 horas/)).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.approve.confirm') }),
    );

    expect(await screen.findByText(t('proposals.publication.approvedState'))).toBeInTheDocument();
  });

  it('starts a rejection on Cancelar and blocks a reason that is too short', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath, { user: board() });

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.reject') }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: t('proposals.editor.cancel') }),
    ).toHaveFocus();

    await userEvent.type(within(dialog).getByRole('textbox'), 'corto');
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.reject.confirm') }),
    );
    expect(
      await within(dialog).findByText('El motivo tiene menos de 10 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('rejects with a valid reason and returns to the list', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath, { user: board() });

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.reject') }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), LONG_REASON);
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.reject.confirm') }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: t('screens.proposals') }),
    ).toBeInTheDocument();
  });

  it('publishes an approved schedule after the confirmation text', async () => {
    server.use(
      ...createProposalsBackend([buildProposal({ status: 'APPROVED', lock_version: 1 })]).handlers,
    );
    renderApp(`${ROUTE_PATHS.board.publication}?proposal=${PROPOSAL_ID_TODAY}`, { user: board() });

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.publication.publish') }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t('proposals.publication.confirmText'))).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.publication.confirm') }),
    );

    expect(await screen.findByText(t('proposals.publication.success'))).toBeInTheDocument();
  });

  it('says there is no approved schedule when the day has none', async () => {
    server.use(...createProposalsBackend([]).handlers);
    renderApp(ROUTE_PATHS.board.publication, { user: board() });

    expect(await screen.findByText(t('proposals.publication.empty'))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: t('proposals.publication.toProposals') }),
    ).toHaveAttribute('href', ROUTE_PATHS.board.proposals);
  });

  it('sends a pending proposal to its review from the publication screen', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(`${ROUTE_PATHS.board.publication}?proposal=${PROPOSAL_ID_TODAY}`, { user: board() });

    expect(await screen.findByRole('link', { name: t('proposals.guide.review') })).toHaveAttribute(
      'href',
      detailPath,
    );
  });
});
