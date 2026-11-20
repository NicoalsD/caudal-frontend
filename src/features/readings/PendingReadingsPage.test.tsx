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

const TANK_ID = '0190f3a2-0000-7000-8000-0000000000e1';
/** 13:15 UTC is 8:15 a. m. in America/Bogota (UTC-5, no daylight saving). */
const OBSERVED_AT = '2026-10-14T13:15:00.000Z';
const operator = () => buildSessionUser({ role: 'OPERATOR' });
const VALUE_ONE = 2.1;
const VALUE_TWO = 2.2;
const REFUSED_VALUE = 8;
const TWO_READINGS = 2;

function payload(gaugeValue: number): SubmitReadingPayload {
  return {
    tankId: TANK_ID,
    gaugeValue,
    waterAppearanceCode: 'NORMAL',
    damageNoticed: false,
    note: '',
    observedAt: OBSERVED_AT,
  };
}

function renderPending(): RenderedApp & { owner: { userId: string; aqueductId: string } } {
  const user = operator();
  const app = renderApp(ROUTE_PATHS.operator.pending, { user });
  return { ...app, owner: { userId: user.userId, aqueductId: user.aqueductId } };
}

describe('PendingReadingsPage (S09)', () => {
  it('says there is nothing pending when the phone holds no reading', async () => {
    renderPending();

    expect(await screen.findByText(t('pending.empty'))).toBeInTheDocument();
    expect(screen.getByText(t('pending.emptyHelp'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('home.newReading') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.newReading,
    );
  });

  it('lists each reading with its value, its time in 12 hours and its status', async () => {
    const { services, owner } = renderPending();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-1', payload(VALUE_ONE)),
      owner,
      null,
    );

    expect(await screen.findByText(t('pending.value', { value: '2,1' }))).toBeInTheDocument();
    expect(screen.getByText(/8:15/)).toBeInTheDocument();
    expect(screen.getByText(t('pending.status.pending'))).toBeInTheDocument();
  });

  it('sends the queue now and says how many readings left the phone', async () => {
    const backend = createReadingsBackend();
    server.use(...backend.handlers);
    const { services, owner } = renderPending();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-1', payload(VALUE_ONE)),
      owner,
      null,
    );
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-2', payload(VALUE_TWO)),
      owner,
      null,
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('pending.sendNow') }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        t('pending.sentCount', { count: String(TWO_READINGS) }),
      );
    });
    expect(backend.batches).toHaveLength(1);
    expect(await services.offline.outbox.pendingFor(owner)).toEqual([]);
  });

  it('shows the readings the server refused with their fix and discard actions', async () => {
    const { services, owner } = renderPending();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-1', payload(REFUSED_VALUE)),
      owner,
      null,
    );
    await services.offline.outbox.settle('c-1', {
      type: 'REJECTED',
      code: 'GAUGE_OUT_OF_RANGE',
      details: { gauge_min: '0', gauge_max: '5' },
    });

    const correct = await screen.findByRole('button', { name: t('readings.review.correct') });
    const card = correct.closest('article')!;
    expect(within(card).getByText(t('readings.review.needsReview'))).toBeVisible();
    expect(
      within(card).getByText(t('pending.value', { value: String(REFUSED_VALUE) })),
    ).toBeVisible();
    expect(within(card).getByRole('button', { name: t('readings.review.discard') })).toBeVisible();
  });

  it('cannot send while the phone is offline and says it is waiting for a signal', async () => {
    const { services, owner } = renderPending();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-offline', payload(VALUE_ONE)),
      owner,
      null,
    );
    services.offline.connectivity.start();

    window.dispatchEvent(new Event('offline'));

    const button = await screen.findByRole('button', { name: t('pending.waitingSignal') });
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('says the readings are sent by themselves when the signal comes back', async () => {
    const { services, owner } = renderPending();
    await services.offline.outbox.enqueue(
      new SubmitReadingCommand('c-auto', payload(VALUE_ONE)),
      owner,
      null,
    );

    expect(await screen.findByText(new RegExp(t('pending.autoSend')))).toBeInTheDocument();
  });
});
