import { http, HttpResponse } from 'msw';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SubmitReadingCommand } from '../../core/commands/SubmitReadingCommand';
import type { SubmitReadingPayload } from '../../core/commands/SubmitReadingCommand';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { createReadingsBackend } from '../../test/msw/readingsBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TANK_ID = '0190f3a2-0000-7000-8000-0000000000e1';
const SENT_ID = 'c-sent';
const REASON_MIN = 10;
const REASON_MAX = 500;
const REASON = 'Se leyó 2,0 y no 2,4 como quedó anotado.';
const operator = () => buildSessionUser({ role: 'OPERATOR' });

const PAYLOAD: SubmitReadingPayload = {
  tankId: TANK_ID,
  gaugeValue: 2.4,
  waterAppearanceCode: 'NORMAL',
  damageNoticed: false,
  note: '',
  observedAt: '2026-10-14T08:00:00.000Z',
};

/** Opens the reading screen after one reading was sent during this session. */
async function renderWithSentReading() {
  const user = operator();
  const batch = createReadingsBackend();
  server.use(...batch.handlers);
  const app = renderApp(ROUTE_PATHS.operator.pending, { user });
  const owner = { userId: user.userId, aqueductId: user.aqueductId };
  await app.services.offline.outbox.enqueue(
    new SubmitReadingCommand(SENT_ID, PAYLOAD),
    owner,
    null,
  );
  await app.services.offline.outbox.settle(SENT_ID, { type: 'SAVED' });
  return app;
}

describe('SentReadingRow: correcting a reading the server has', () => {
  it('stores the correction with its reason and says the original stays', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(`/readings/${SENT_ID}/corrections`), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            correction: {
              id: 'k-1',
              reading_id: SENT_ID,
              corrected_gauge_value: 2,
              reason: REASON,
              corrected_by: 'u-1',
              created_at: '2026-10-14T13:05:00Z',
            },
            effective_gauge_value: 2,
          },
          { status: 201 },
        );
      }),
    );
    await renderWithSentReading();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.sent.correct') }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t('readings.correction.description'))).toBeInTheDocument();
    const value = within(dialog).getByLabelText(t('readings.correction.valueLabel'));
    await user.clear(value);
    await user.type(value, '2');
    await user.type(within(dialog).getByLabelText(t('readings.correction.reasonLabel')), REASON);
    await user.click(within(dialog).getByRole('button', { name: t('readings.correction.submit') }));

    await waitFor(() => {
      expect(body).toEqual({ corrected_gauge_value: 2, reason: REASON });
    });
    expect(await screen.findByRole('status')).toHaveTextContent(t('readings.sent.correctedNotice'));
  });

  it('asks for a reason of the server length before it sends anything', async () => {
    await renderWithSentReading();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.sent.correct') }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(t('readings.correction.reasonLabel')), 'corto');
    await user.click(within(dialog).getByRole('button', { name: t('readings.correction.submit') }));

    expect(await within(dialog).findByText(t('validation.min', { min: '10' }))).toBeInTheDocument();
  });

  it('does not offer the correction without a connection', async () => {
    const batch = createReadingsBackend();
    server.use(...batch.handlers);
    const app = await renderWithSentReading();
    app.services.offline.connectivity.start();
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(await screen.findByRole('button', { name: t('readings.sent.correct') })).toBeDisabled();
    expect(screen.getByText(t('readings.sent.offline'))).toBeInTheDocument();
  });
  it('arms the correction with the reason limits the server sends under "reason"', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        HttpResponse.json({ reason: { min: REASON_MIN, max: REASON_MAX } }),
      ),
    );
    await renderWithSentReading();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('readings.sent.correct') }));
    const dialog = await screen.findByRole('dialog');

    expect(
      await within(dialog).findByLabelText(t('readings.correction.reasonLabel')),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(t('connection.constraintsMissing'))).not.toBeInTheDocument();
  });
});
