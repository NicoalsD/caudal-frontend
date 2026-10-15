import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { PERMISSIONS_BY_ROLE } from '../factories/auth';
import { buildSessionUser } from '../factories/session';
import { createProposalsBackend } from '../msw/proposalsBackend';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

/** The Board's day, end to end over MSW: generate, review, modify, approve, publish, reject. */

const board = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: [...PERMISSIONS_BY_ROLE.BOARD_MEMBER] });
const HIGH_NAME = 'Sector Alto';
const REASON = 'Se pidió dejar una hora más al sector alto para la escuela.';
const SHORT_REASON = 'corto';

function generateToday() {
  server.use(...createProposalsBackend([]).handlers);
  renderApp(ROUTE_PATHS.board.proposals, { user: board() });
  return screen.findByRole('button', { name: t('proposals.generate') });
}

describe('proposal decision flow (F057)', () => {
  it('generates, opens, modifies with a reason, and publishes the changed schedule', async () => {
    await userEvent.click(await generateToday());
    await userEvent.click(await screen.findByRole('link', { name: t('proposals.open') }));

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.modify') }),
    );
    const hours = await screen.findByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: HIGH_NAME }),
    });
    await userEvent.clear(hours);
    await userEvent.type(hours, '7');
    await userEvent.type(screen.getByRole('textbox', { name: /Motivo del cambio/ }), REASON);
    await userEvent.click(screen.getByRole('button', { name: t('proposals.editor.save') }));

    expect(await screen.findByText(t('proposals.status.approvedWithChanges'))).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.publish') }),
    );
    expect(await screen.findByText(t('proposals.publication.approvedState'))).toBeInTheDocument();
    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.publication.publish') }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.publication.confirm') }),
    );

    expect(await screen.findByText(t('proposals.publication.success'))).toBeInTheDocument();
  });

  it('blocks a modification whose reason is too short', async () => {
    await userEvent.click(await generateToday());
    await userEvent.click(await screen.findByRole('link', { name: t('proposals.open') }));
    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.modify') }),
    );
    const hours = await screen.findByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: HIGH_NAME }),
    });
    await userEvent.clear(hours);
    await userEvent.type(hours, '7');
    await userEvent.type(screen.getByRole('textbox', { name: /Motivo del cambio/ }), SHORT_REASON);

    expect(await screen.findByText('El motivo tiene menos de 10 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('proposals.editor.save') })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('rejects a proposal with a reason, and the day can be generated again', async () => {
    await userEvent.click(await generateToday());
    await userEvent.click(await screen.findByRole('link', { name: t('proposals.open') }));
    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.reject') }),
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox'), REASON);
    await userEvent.click(
      within(dialog).getByRole('button', { name: t('proposals.reject.confirm') }),
    );

    expect(
      await screen.findByRole('button', { name: t('proposals.generate') }),
    ).toBeInTheDocument();
  });
});
