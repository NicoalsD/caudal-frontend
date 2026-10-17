import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildMinutes } from '../factories/minutes';
import { buildScheduleProposal, ITEM_ID_A, SERVICE_DAY } from '../factories/schedule';
import { buildSessionUser } from '../factories/session';
import { createMinutesBackend } from '../msw/minutesBackend';
import { createScheduleBackend } from '../msw/scheduleBackend';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

const DAY_PATH = ROUTE_PATHS.operator.dayClosure.replace(':date', SERVICE_DAY);
const NOTE = 'Día sin novedades mayores.';
const SHORT_HASH_LENGTH = 12;
const SHA256_LENGTH = 64;
const PDF_SHA256 = 'b'.repeat(SHA256_LENGTH);

/** The card of one sector, found by its heading. */
async function cardOf(name: string): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { level: 2, name });
  return heading.closest('section')!;
}

describe('cierre del día (S10) de principio a fin', () => {
  it('registers the shifts of the day and closes it, then shows the closed day read-only', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: buildSessionUser({ role: 'OPERATOR' }) });

    const high = await cardOf('Sector Alto');
    await userEvent.click(within(high).getByRole('radio', { name: t('closure.statusCompleted') }));
    await userEvent.click(within(high).getByRole('button', { name: t('closure.save') }));
    await within(high).findByText(t('closure.saved'));

    const low = await cardOf('Sector Bajo');
    await userEvent.click(within(low).getByRole('radio', { name: t('closure.statusPartial') }));
    fireEvent.change(within(low).getByLabelText(t('closure.actualStart')), {
      target: { value: '14:00' },
    });
    await userEvent.click(within(low).getByRole('button', { name: t('closure.save') }));
    await within(low).findByText(t('closure.saved'));
    expect(backend.executions.map((item) => item.status)).toEqual(['COMPLETED', 'PARTIAL']);

    await userEvent.type(await screen.findByLabelText(t('closure.closeNotesLabel')), NOTE);
    await userEvent.click(screen.getByRole('button', { name: t('closure.closeAction') }));
    await userEvent.click(await screen.findByRole('button', { name: t('closure.closeConfirm') }));

    expect(
      await screen.findByRole('heading', { level: 1, name: t('closure.closedTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(backend.closureRequests).toEqual([{ notes: NOTE }]);
    expect(
      screen.queryByRole('radio', { name: t('closure.statusCompleted') }),
    ).not.toBeInTheDocument();
  });

  it('opens a day that was already closed as read-only', async () => {
    const backend = createScheduleBackend(buildScheduleProposal({ status: 'CLOSED' }));
    backend.state.closure = {
      id: '0190f3a2-bbbb-7000-8000-000000000009',
      service_date: SERVICE_DAY,
      notes: NOTE,
      closed_by: '0190f3a2-cccc-7000-8000-000000000001',
      closed_at: '2026-10-10T20:00:00-05:00',
      executions: [],
    };
    backend.executions.push({
      id: '0190f3a2-aaaa-7000-8000-000000000001',
      schedule_item_id: ITEM_ID_A,
      status: 'COMPLETED',
    });
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: buildSessionUser({ role: 'OPERATOR' }) });

    expect(await screen.findByText(t('closure.closedReadOnly'))).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.getByText(t('closure.statusCompleted'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('closure.closeAction') }),
    ).not.toBeInTheDocument();
  });
});

describe('actas (S20) de principio a fin', () => {
  it('generates an acta, reads its four sections, finalizes it and offers the PDF', async () => {
    const backend = createMinutesBackend([]);
    server.use(...backend.handlers);
    renderApp(ROUTE_PATHS.board.minutes, { user: buildSessionUser({ role: 'BOARD_ADMIN' }) });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.generate') }));
    fireEvent.change(screen.getByLabelText(t('minutes.periodFrom')), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText(t('minutes.periodTo')), {
      target: { value: '2026-10-07' },
    });
    await userEvent.click(screen.getByRole('button', { name: t('minutes.periodSubmit') }));

    expect(
      await screen.findByRole('heading', { level: 4, name: t('minutes.sectionObserved') }),
    ).toBeInTheDocument();
    for (const label of [
      t('minutes.sectionEstimated'),
      t('minutes.sectionInferred'),
      t('minutes.sectionConfirmed'),
    ]) {
      expect(screen.getByRole('heading', { level: 4, name: label })).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('button', { name: t('minutes.finalize') }));
    await userEvent.click(
      await screen.findByRole('button', { name: t('minutes.finalizeConfirm') }),
    );
    expect(await screen.findByRole('button', { name: t('minutes.downloadPdf') })).toBeEnabled();
    expect(backend.actas[0]?.status).toBe('FINAL');
  });

  it('shows the PDF hash of a final acta, shortened', async () => {
    server.use(
      ...createMinutesBackend([
        buildMinutes({
          status: 'FINAL',
          pdf_sha256: PDF_SHA256,
          finalized_at: '2026-10-08T15:00:00Z',
        }),
      ]).handlers,
    );
    renderApp(ROUTE_PATHS.board.minutes, { user: buildSessionUser({ role: 'BOARD_MEMBER' }) });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.view') }));

    expect(
      await screen.findByText(`${PDF_SHA256.slice(0, SHORT_HASH_LENGTH)}…`),
    ).toBeInTheDocument();
  });

  it('does not open the actas for an operator (route guard)', async () => {
    server.use(...createMinutesBackend([buildMinutes()]).handlers);
    renderApp(ROUTE_PATHS.board.minutes, { user: buildSessionUser({ role: 'OPERATOR' }) });

    expect(await screen.findByText(t('errors.forbiddenTitle'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('minutes.generate') })).not.toBeInTheDocument();
  });
});
