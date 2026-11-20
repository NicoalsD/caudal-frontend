import { screen, waitFor } from '@testing-library/react';
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
const editPath = (id: string) => ROUTE_PATHS.board.proposalEdit.replace(':id', id);
const SCHOOL_NAME = 'Sector Escuela';
const HIGH_NAME = 'Sector Alto';
const SHORT_REASON = 'corto';

async function openEditor() {
  server.use(...createProposalsBackend([buildProposal()]).handlers);
  renderApp(editPath(PROPOSAL_ID_TODAY), { user: board() });
  return screen.findByRole('button', { name: t('proposals.editor.save') });
}

function hoursField(sector: string) {
  return screen.getByRole('spinbutton', { name: t('proposals.editor.hoursOf', { sector }) });
}

describe('ProposalEditorPage (S14) live validation', () => {
  it('shows the total against the available hours and blocks a total above them', async () => {
    await openEditor();
    expect(screen.getByText('Total: 11 de 16 horas disponibles')).toBeInTheDocument();

    await userEvent.clear(hoursField(HIGH_NAME));
    await userEvent.type(hoursField(HIGH_NAME), '14');

    expect(
      await screen.findByText('El total supera las horas disponibles (16).'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('proposals.editor.save') })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('asks for a reason of at least the server minimum before saving', async () => {
    const save = await openEditor();
    await userEvent.clear(hoursField(SCHOOL_NAME));
    await userEvent.type(hoursField(SCHOOL_NAME), '2');
    expect(save).toHaveAttribute('aria-disabled', 'true');

    await userEvent.type(screen.getByRole('textbox', { name: /Motivo del cambio/ }), SHORT_REASON);
    expect(await screen.findByText('El motivo tiene menos de 10 caracteres.')).toBeInTheDocument();
    expect(save).toHaveAttribute('aria-disabled', 'true');

    await userEvent.type(screen.getByRole('textbox', { name: /Motivo del cambio/ }), ' de sobra');
    await waitFor(() => {
      expect(save).toHaveAttribute('aria-disabled', 'false');
    });
  });

  it('puts each problem next to its field and links it with aria-describedby', async () => {
    await openEditor();
    await userEvent.clear(hoursField(SCHOOL_NAME));
    await userEvent.type(hoursField(SCHOOL_NAME), '0');
    await userEvent.click(screen.getByRole('button', { name: t('proposals.editor.save') }));

    const message = await screen.findByText('Un turno no puede durar menos de 1 hora.');
    expect(hoursField(SCHOOL_NAME)).toHaveAttribute('aria-describedby', message.id);
    expect(hoursField(SCHOOL_NAME)).toHaveAttribute('aria-invalid', 'true');
  });

  it('moves the focus to the first problem when saving with errors', async () => {
    await openEditor();
    await userEvent.clear(hoursField(HIGH_NAME));
    await userEvent.type(hoursField(HIGH_NAME), '0');
    await userEvent.click(screen.getByRole('button', { name: t('proposals.editor.save') }));

    expect(hoursField(HIGH_NAME)).toHaveFocus();
    expect(screen.getByText(t('proposals.editor.firstError'))).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Motivo del cambio/ })).toHaveValue('');
  });

  it('shows the original hours of each shift for reference', async () => {
    await openEditor();
    expect(screen.getByText('Original: 3 horas')).toBeInTheDocument();
    expect(screen.getByText('Original: 8 horas')).toBeInTheDocument();
  });
});
