import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { createReadingsBackend } from '../../test/msw/readingsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';
import type { RenderedApp } from '../../test/renderApp';
import { refusalMessage } from './ReadingIssues';

const TANK_ID = '0190f3a2-0000-7000-8000-0000000000e1';
const GAUGE_RANGE = { gauge_min: '0', gauge_max: '5' };
const OUT_OF_RANGE_TEXT = 'La lectura está fuera del rango del tanque (0 a 5). Revisa el número.';
/** The server sends the range with decimals ("0,00"); the text keeps them. */
const SERVER_RANGE_TEXT =
  'La lectura está fuera del rango del tanque (0,00 a 5,00). Revisa el número.';
const REFUSED_ID = 'c-refused';
const NEW_VALUE = '2,5';
const REASON = 'La lectura era de ayer; ya se registró otra igual.';

const operator = () => buildSessionUser({ role: 'OPERATOR', permissions: ['READING_CREATE'] });

const PAYLOAD: SubmitReadingPayload = {
  tankId: TANK_ID,
  gaugeValue: 8,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

/** Opens the app on the reading screen with one reading the server refused as out of range. */
async function renderWithRefusal() {
  const user = operator();
  const backend = createReadingsBackend();
  server.use(...backend.handlers);
  const app: RenderedApp = renderApp(ROUTE_PATHS.operator.pending, { user });
  const owner = { userId: user.userId, aqueductId: user.aqueductId };
  const { outbox } = app.services.offline;
  await outbox.enqueue(new SubmitReadingCommand(REFUSED_ID, PAYLOAD), owner, null);
  await outbox.settle(REFUSED_ID, {
    type: 'REJECTED',
    code: 'GAUGE_OUT_OF_RANGE',
    details: { gauge_min: '0,00', gauge_max: '5,00', value: '8,00' },
  });
  return { ...app, backend, owner };
}

describe('refusalMessage', () => {
  it('turns the code and the server range into the plain-language text', () => {
    expect(refusalMessage('GAUGE_OUT_OF_RANGE', GAUGE_RANGE, null)).toBe(OUT_OF_RANGE_TEXT);
  });

  it('takes the range from the phone when the server did not send it', () => {
    expect(refusalMessage('GAUGE_OUT_OF_RANGE', {}, { min: 0, max: 5, step: 0.01 })).toBe(
      OUT_OF_RANGE_TEXT,
    );
  });

  it('never shows an unfilled template', () => {
    expect(refusalMessage('GAUGE_OUT_OF_RANGE', {}, null)).toBe(t('errors.generic'));
  });

  it('shows the generic text for a code it does not know', () => {
    expect(refusalMessage('SOMETHING_NEW', {}, null)).toBe(t('errors.generic'));
  });
});

describe('ReadingIssues: refused readings', () => {
  it('shows the reason in plain words, with the range the server sent', async () => {
    await renderWithRefusal();

    expect(await screen.findByRole('heading', { name: t('readings.review.title') })).toBeVisible();
    expect(screen.getByText(t('readings.review.needsReview'))).toBeInTheDocument();
    expect(screen.getByText(SERVER_RANGE_TEXT)).toBeInTheDocument();
  });

  it('corrects the value and sends it again as a new reading', async () => {
    const { backend, services, owner } = await renderWithRefusal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.review.correct') }));
    const dialog = await screen.findByRole('dialog');
    const gauge = within(dialog).getByLabelText(t('readings.gaugeLabel'));
    await user.clear(gauge);
    await user.type(gauge, NEW_VALUE);
    await user.click(
      within(dialog).getByRole('button', { name: t('readings.review.resendSubmit') }),
    );

    await waitFor(() => {
      expect(backend.batches).toHaveLength(1);
    });
    const [sent] = backend.batches[0]?.readings ?? [];
    expect(sent).toMatchObject({ gauge_value: 2.5, tank_id: TANK_ID });
    expect(sent?.id).not.toBe(REFUSED_ID);
    await waitFor(async () => {
      expect(await services.offline.outbox.pendingFor(owner)).toEqual([]);
    });
    expect(services.offline.syncQueue.getSnapshot().needsReviewCount).toBe(0);
  });

  it('refuses a corrected value outside the range before sending it', async () => {
    await renderWithRefusal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.review.correct') }));
    const dialog = await screen.findByRole('dialog');
    const gauge = within(dialog).getByLabelText(t('readings.gaugeLabel'));
    await user.clear(gauge);
    await user.type(gauge, '9');
    await user.click(
      within(dialog).getByRole('button', { name: t('readings.review.resendSubmit') }),
    );

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
  });

  it('discards only with a reason, and Cancel has the focus when the question opens', async () => {
    const { services, owner } = await renderWithRefusal();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.review.discard') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: t('readings.review.cancel') })).toHaveFocus();

    await user.type(within(dialog).getByLabelText(t('readings.review.discardReasonLabel')), REASON);
    await user.click(
      within(dialog).getByRole('button', { name: t('readings.review.discardConfirm') }),
    );

    await waitFor(() => {
      expect(services.offline.syncQueue.getSnapshot().needsReviewCount).toBe(0);
    });
    expect(await services.offline.outbox.correctionsFor(owner)).toEqual([]);
    expect(services.offline.outbox.closedFor(owner)).toEqual([
      expect.objectContaining({ clientId: REFUSED_ID, outcome: 'DISCARDED', reason: REASON }),
    ]);
  });
});
