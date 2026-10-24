import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { toBogotaDateKey } from '../../core/format/time';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { buildScheduleProposal, SERVICE_DAY } from '../../test/factories/schedule';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createScheduleBackend } from '../../test/msw/scheduleBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const operator = () => buildSessionUser({ role: 'OPERATOR' });
const DAY_PATH = ROUTE_PATHS.operator.dayClosure.replace(':date', SERVICE_DAY);
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const NOTE = 'Día sin novedades mayores. Un turno a medias por la lluvia.';

describe('DayClosurePage closure (S10, operator)', () => {
  it('closes the day after confirming, with its note, and then shows it read-only', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    await userEvent.type(await screen.findByLabelText(t('closure.closeNotesLabel')), NOTE);
    await userEvent.click(screen.getByRole('button', { name: t('closure.closeAction') }));
    await userEvent.click(await screen.findByRole('button', { name: t('closure.closeConfirm') }));

    expect(
      await screen.findByRole('heading', { level: 1, name: t('closure.closedTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(backend.closureRequests).toEqual([{ notes: NOTE }]);
    expect(
      screen.queryByRole('button', { name: t('closure.closeAction') }),
    ).not.toBeInTheDocument();
  });

  it('shows an already closed day as read-only, without the closing form', async () => {
    const backend = createScheduleBackend(buildScheduleProposal({ status: 'CLOSED' }));
    backend.state.closure = {
      id: '0190f3a2-bbbb-7000-8000-000000000009',
      service_date: SERVICE_DAY,
      notes: null,
      closed_by: '0190f3a2-cccc-7000-8000-000000000001',
      closed_at: '2026-10-10T20:00:00-05:00',
      executions: [],
    };
    server.use(...backend.handlers);
    renderApp(DAY_PATH, { user: operator() });

    expect(
      await screen.findByRole('heading', { level: 1, name: t('closure.closedTitle') }),
    ).toBeInTheDocument();
    expect(screen.getByText(t('closure.closedReadOnly'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('closure.closeAction') }),
    ).not.toBeInTheDocument();
  });

  it('switches to the read-only day when the server says it was already closed', async () => {
    const backend = createScheduleBackend(buildScheduleProposal());
    let closed = false;
    server.use(
      ...backend.handlers,
      http.get(apiUrl('/days/:date/closure'), () =>
        closed ? undefined : errorResponse(NOT_FOUND_STATUS, 'NOT_FOUND'),
      ),
      http.post(apiUrl('/days/:date/closure'), () => {
        closed = true;
        return errorResponse(CONFLICT_STATUS, 'CONFLICT');
      }),
    );
    renderApp(DAY_PATH, { user: operator() });

    await userEvent.click(await screen.findByRole('button', { name: t('closure.closeAction') }));
    await userEvent.click(await screen.findByRole('button', { name: t('closure.closeConfirm') }));

    expect(
      await screen.findByRole('heading', { level: 1, name: t('closure.closedTitle') }),
    ).toBeInTheDocument();
  });

  it('opens the closure of today from the operator home link', async () => {
    server.use(...createScheduleBackend(buildScheduleProposal()).handlers);
    const { router } = renderApp(ROUTE_PATHS.operator.home, { user: operator() });

    // The checklist is complete once the level has loaded; clicking before that would miss it.
    await screen.findByText(t('home.levelValue', { value: '2,3' }));
    const link = screen.getByRole('link', { name: t('home.dayClosure') });
    await userEvent.click(link);

    const today = toBogotaDateKey(new Date().toISOString());
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        ROUTE_PATHS.operator.dayClosure.replace(':date', today),
      ),
    );
  });
});
