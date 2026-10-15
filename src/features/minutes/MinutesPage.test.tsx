import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { apiUrl } from '../../test/msw/apiUrl';
import { PDF_SHA256 } from '../../test/msw/minutesBackend';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import {
  buildMinutes,
  MINUTES_ID_A,
  MINUTES_ID_B,
  MINUTES_ID_C,
} from '../../test/factories/minutes';
import { server } from '../../test/msw/server';
import { createMinutesBackend } from '../../test/msw/minutesBackend';
import { renderApp } from '../../test/renderApp';

const board = () => buildSessionUser({ role: 'BOARD_ADMIN' });
const PAGE_PATH = ROUTE_PATHS.board.minutes;
const FIRST_PAGE_ROWS = 2;
const ALL_ROWS = 3;
const SHORT_HASH_LENGTH = 12;

describe('MinutesPage (S20, board)', () => {
  it('shows the empty state when there are no actas', async () => {
    server.use(...createMinutesBackend([]).handlers);
    renderApp(PAGE_PATH, { user: board() });

    expect(await screen.findByText(t('minutes.empty'))).toBeInTheDocument();
  });

  it('opens an acta and shows its four sections with their chips and plain sentences', async () => {
    server.use(...createMinutesBackend([buildMinutes()]).handlers);
    renderApp(PAGE_PATH, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.view') }));

    const observed = await screen.findByRole('heading', {
      level: 4,
      name: t('minutes.sectionObserved'),
    });
    const section = observed.closest('section')!;
    expect(within(section).getByText('Lectura del tanque: 2,10 m.')).toBeInTheDocument();
    for (const label of [
      t('minutes.sectionEstimated'),
      t('minutes.sectionInferred'),
      t('minutes.sectionConfirmed'),
    ]) {
      expect(screen.getByRole('heading', { level: 4, name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('Posible fuga en el sector Alto.')).toBeInTheDocument();
    expect(screen.getByText(t('minutes.sectionEmpty'))).toBeInTheDocument();
  });

  it('loads the next page with "Ver más"', async () => {
    server.use(
      ...createMinutesBackend([
        buildMinutes({ id: MINUTES_ID_A }),
        buildMinutes({ id: MINUTES_ID_B }),
        buildMinutes({ id: MINUTES_ID_C, period_from: '2026-09-01', period_to: '2026-09-30' }),
      ]).handlers,
    );
    renderApp(PAGE_PATH, { user: board() });

    expect(await screen.findAllByRole('button', { name: t('minutes.view') })).toHaveLength(
      FIRST_PAGE_ROWS,
    );
    await userEvent.click(screen.getByRole('button', { name: t('minutes.loadMore') }));
    expect(await screen.findAllByRole('button', { name: t('minutes.view') })).toHaveLength(
      ALL_ROWS,
    );
  });

  it('generates an acta for a period and opens it', async () => {
    const backend = createMinutesBackend([]);
    server.use(...backend.handlers);
    renderApp(PAGE_PATH, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.generate') }));
    fireEvent.change(screen.getByLabelText(t('minutes.periodFrom')), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText(t('minutes.periodTo')), {
      target: { value: '2026-10-07' },
    });
    await userEvent.click(screen.getByRole('button', { name: t('minutes.periodSubmit') }));

    expect(await screen.findByRole('heading', { level: 2, name: /al 7/ })).toBeInTheDocument();
    expect(backend.actas).toHaveLength(1);
    expect(backend.actas[0]).toMatchObject({ period_from: '2026-10-01', period_to: '2026-10-07' });
  });

  it('refuses a period whose end is before its start, without asking the server', async () => {
    const backend = createMinutesBackend([]);
    server.use(...backend.handlers);
    renderApp(PAGE_PATH, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.generate') }));
    fireEvent.change(screen.getByLabelText(t('minutes.periodFrom')), {
      target: { value: '2026-10-07' },
    });
    fireEvent.change(screen.getByLabelText(t('minutes.periodTo')), {
      target: { value: '2026-10-01' },
    });
    await userEvent.click(screen.getByRole('button', { name: t('minutes.periodSubmit') }));

    expect(await screen.findByText(t('minutes.periodReversed'))).toBeInTheDocument();
    expect(backend.actas).toHaveLength(0);
  });

  it('finalizes a draft after the confirmation and then offers the PDF and its hash', async () => {
    const backend = createMinutesBackend([buildMinutes()]);
    server.use(...backend.handlers);
    renderApp(PAGE_PATH, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.view') }));
    await userEvent.click(await screen.findByRole('button', { name: t('minutes.finalize') }));
    await userEvent.click(
      await screen.findByRole('button', { name: t('minutes.finalizeConfirm') }),
    );

    const link = await screen.findByRole('link', { name: t('minutes.downloadPdf') });
    expect(link).toHaveAttribute('href', apiUrl(`/minutes/${MINUTES_ID_A}/pdf`));
    expect(screen.getByText(`${PDF_SHA256.slice(0, SHORT_HASH_LENGTH)}…`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('minutes.finalize') })).not.toBeInTheDocument();
    expect(backend.actas[0]?.status).toBe('FINAL');
  });

  it('copies the whole hash of a final acta', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    server.use(
      ...createMinutesBackend([
        buildMinutes({
          status: 'FINAL',
          pdf_sha256: PDF_SHA256,
          finalized_at: '2026-10-08T15:00:00Z',
        }),
      ]).handlers,
    );
    renderApp(PAGE_PATH, { user: board() });

    await userEvent.click(await screen.findByRole('button', { name: t('minutes.view') }));
    await userEvent.click(await screen.findByRole('button', { name: t('minutes.copyHash') }));

    expect(writeText).toHaveBeenCalledWith(PDF_SHA256);
    expect(await screen.findByText(t('minutes.copiedHash'))).toBeInTheDocument();
  });
});
