import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import {
  buildProposalSummary,
  buildScheduleProposal,
  ITEM_ID_A,
  SERVICE_DAY,
} from '../../test/factories/schedule';
import { apiUrl } from '../../test/msw/apiUrl';
import { createScheduleBackend } from '../../test/msw/scheduleBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const operator = () => buildSessionUser({ role: 'OPERATOR' });
const TWO_EXECUTIONS = 2;
const DAY_PATH = ROUTE_PATHS.operator.dayClosure.replace(':date', SERVICE_DAY);

/** The card of one sector, found by its heading. */
async function cardOf(name: string): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { level: 2, name });
  return heading.closest('section')!;
}

describe('DayClosurePage (S10, operator)', () => {
  it('lists each shift of the day with its sector, hours and the three ways it went', async () => {
    server.use(...createScheduleBackend(buildScheduleProposal()).handlers);
    renderApp(DAY_PATH, { user: operator() });

    const card = await cardOf('Sector Alto');
    expect(
      await within(card).findByRole('radio', { name: t('closure.statusCompleted') }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('radio', { name: t('closure.statusPartial') }),
    ).toBeInTheDocument();
    expect(
      within(card).getByRole('radio', { name: t('closure.statusNotExecuted') }),
    ).toBeInTheDocument();
    expect(within(card).getByText('6:00 a. m. a 2:00 p. m.')).toBeInTheDocument();
  });

  it('registers a shift that was completed as planned, with no times', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    const card = await cardOf('Sector Alto');
    await userEvent.click(
      await within(card).findByRole('radio', { name: t('closure.statusCompleted') }),
    );
    await userEvent.click(within(card).getByRole('button', { name: t('closure.save') }));

    expect(await within(card).findByText(t('closure.saved'))).toBeInTheDocument();
    expect(backend.executions).toHaveLength(1);
    expect(backend.executions[0]).toMatchObject({
      schedule_item_id: ITEM_ID_A,
      status: 'COMPLETED',
      actual_start: null,
      actual_end: null,
    });
  });

  it('asks for the real start of a partial shift and does not send it without one', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    const card = await cardOf('Sector Alto');
    await userEvent.click(
      await within(card).findByRole('radio', { name: t('closure.statusPartial') }),
    );
    await userEvent.click(within(card).getByRole('button', { name: t('closure.save') }));

    expect(await within(card).findByText(t('closure.startRequired'))).toBeInTheDocument();
    expect(backend.executions).toHaveLength(0);
  });

  it('refuses a real end that is not after the real start', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    const card = await cardOf('Sector Alto');
    await userEvent.click(
      await within(card).findByRole('radio', { name: t('closure.statusPartial') }),
    );
    await userEvent.type(within(card).getByLabelText(t('closure.actualStart')), '09:00');
    await userEvent.type(within(card).getByLabelText(t('closure.actualEnd')), '08:00');
    await userEvent.click(within(card).getByRole('button', { name: t('closure.save') }));

    expect(await within(card).findByText(t('closure.endNotAfterStart'))).toBeInTheDocument();
    expect(backend.executions).toHaveLength(0);
  });

  it('sends a change of a saved shift as a replacement of its execution', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    const card = await cardOf('Sector Alto');
    await userEvent.click(
      await within(card).findByRole('radio', { name: t('closure.statusCompleted') }),
    );
    await userEvent.click(within(card).getByRole('button', { name: t('closure.save') }));
    await within(card).findByText(t('closure.saved'));

    await userEvent.click(
      within(card).getByRole('radio', { name: t('closure.statusNotExecuted') }),
    );
    await userEvent.click(within(card).getByRole('button', { name: t('closure.saveChange') }));

    await waitFor(() => expect(backend.executions).toHaveLength(TWO_EXECUTIONS));
    expect(backend.executions[1]).toMatchObject({
      status: 'NOT_EXECUTED',
      supersedes_id: backend.executions[0]?.id,
    });
  });

  it('says that the day has no published shifts', async () => {
    server.use(
      http.get(apiUrl('/schedule-proposals'), () =>
        HttpResponse.json({
          items: [buildProposalSummary({ status: 'REJECTED' })],
          next_cursor: null,
        }),
      ),
    );
    renderApp(DAY_PATH, { user: operator() });

    expect(await screen.findByText(t('closure.empty'))).toBeInTheDocument();
  });
});
