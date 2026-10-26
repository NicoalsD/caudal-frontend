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
const editPath = ROUTE_PATHS.board.proposalEdit.replace(':id', PROPOSAL_ID_TODAY);
const detailPath = ROUTE_PATHS.board.proposalDetail.replace(':id', PROPOSAL_ID_TODAY);
const SCHOOL = 'Sector Escuela';
const HIGH = 'Sector Alto';
const HIGH_HOURS_TEXT = '4';
const KEYBOARD_HOURS = '2';
const TOTAL_HOURS_AFTER_KEYBOARD = 2;
const TOTAL_TEXT = 'Total: 10 de 16 horas disponibles';

async function openEditor() {
  server.use(...createProposalsBackend([buildProposal()]).handlers);
  renderApp(editPath, { user: board() });
  return screen.findByRole('button', { name: t('proposals.editor.save') });
}

describe('ProposalEditorPage accessibility (F058)', () => {
  it('labels every control: slider, numeric field, reason and buttons', async () => {
    await openEditor();
    for (const sector of [SCHOOL, HIGH]) {
      expect(
        screen.getByRole('slider', { name: t('proposals.editor.sliderOf', { sector }) }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('spinbutton', { name: t('proposals.editor.hoursOf', { sector }) }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox', { name: /Motivo del cambio/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('proposals.editor.save') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('proposals.editor.cancel') })).toBeInTheDocument();
  });

  it('links a shift error to its controls with aria-describedby', async () => {
    await openEditor();
    const number = screen.getByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: HIGH }),
    });
    await userEvent.clear(number);
    await userEvent.type(number, '0');

    const message = await screen.findByText('Un turno no puede durar menos de 1 hora.');
    expect(number).toHaveAttribute('aria-describedby', message.id);
    expect(
      screen.getByRole('slider', { name: t('proposals.editor.sliderOf', { sector: HIGH }) }),
    ).toHaveAttribute('aria-describedby', message.id);
    expect(number).toHaveAttribute('aria-invalid', 'true');
  });

  it('links a reason error to the reason field', async () => {
    await openEditor();
    const number = screen.getByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: HIGH }),
    });
    await userEvent.clear(number);
    await userEvent.type(number, HIGH_HOURS_TEXT);
    const reason = screen.getByRole('textbox', { name: /Motivo del cambio/ });
    await userEvent.type(reason, 'corto');

    const message = await screen.findByText('El motivo tiene menos de 10 caracteres.');
    expect(reason.getAttribute('aria-describedby')?.split(' ')).toContain(message.id);
    expect(reason).toHaveAttribute('aria-invalid', 'true');
  });

  it('reaches every control with the keyboard, in reading order', async () => {
    await openEditor();
    const order = [
      screen.getByRole('slider', { name: t('proposals.editor.sliderOf', { sector: SCHOOL }) }),
      screen.getByRole('spinbutton', { name: t('proposals.editor.hoursOf', { sector: SCHOOL }) }),
      screen.getByRole('slider', { name: t('proposals.editor.sliderOf', { sector: HIGH }) }),
      screen.getByRole('spinbutton', { name: t('proposals.editor.hoursOf', { sector: HIGH }) }),
    ];
    order[0]?.focus();
    for (const control of order.slice(1)) {
      await userEvent.tab();
      expect(control).toHaveFocus();
    }
  });

  it('types hours with the keyboard into the numeric field', async () => {
    await openEditor();
    const number = screen.getByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: SCHOOL }),
    });
    number.focus();
    await userEvent.clear(number);
    await userEvent.keyboard(KEYBOARD_HOURS);

    expect(number).toHaveValue(TOTAL_HOURS_AFTER_KEYBOARD);
    expect(screen.getByText(TOTAL_TEXT)).toBeInTheDocument();
  });

  it('moves the focus to the first problem when saving with errors', async () => {
    await openEditor();
    await userEvent.click(screen.getByRole('button', { name: t('proposals.editor.save') }));
    expect(screen.getByText(t('proposals.editor.noChanges'))).toBeInTheDocument();
    const number = screen.getByRole('spinbutton', {
      name: t('proposals.editor.hoursOf', { sector: HIGH }),
    });
    await userEvent.clear(number);
    await userEvent.type(number, '0');
    await userEvent.click(screen.getByRole('button', { name: t('proposals.editor.save') }));

    expect(number).toHaveFocus();
  });

  it('starts the focus of a rejection on Cancelar', async () => {
    server.use(...createProposalsBackend([buildProposal()]).handlers);
    renderApp(detailPath, { user: board() });

    await userEvent.click(
      await screen.findByRole('button', { name: t('proposals.actions.reject') }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: t('proposals.editor.cancel') }),
    ).toHaveFocus();
  });
});
