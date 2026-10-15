import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { buildAnomaly } from '../../test/factories/status';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const BOARD = buildSessionUser({
  role: 'BOARD_MEMBER',
  permissions: ['STATUS_VIEW', 'ANOMALY_REVIEW'],
});
const OPERATOR = buildSessionUser({ role: 'OPERATOR', permissions: ['STATUS_VIEW'] });

describe('AnomalyList (S12 pending anomalies)', () => {
  it('lists the pending anomaly in plain words with its reading value', async () => {
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });

    expect(await screen.findByText(t('anomalies.kindPossibleLeak'))).toBeVisible();
    expect(screen.getByText(t('anomalies.gaugeValue', { value: '1,9' }))).toBeVisible();
  });

  it('shows the confirm and dismiss actions to the Board', async () => {
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });

    expect(await screen.findByRole('button', { name: t('anomalies.confirm') })).toBeVisible();
    expect(screen.getByRole('button', { name: t('anomalies.dismiss') })).toBeVisible();
  });

  it('hides the review actions from a person without ANOMALY_REVIEW', async () => {
    renderApp(ROUTE_PATHS.tank, { user: OPERATOR });

    expect(await screen.findByText(t('anomalies.kindPossibleLeak'))).toBeVisible();
    expect(screen.queryByRole('button', { name: t('anomalies.confirm') })).not.toBeInTheDocument();
  });

  it('asks for a reason before dismissing and sends it with the dismissal', async () => {
    const sent: unknown[] = [];
    server.use(
      http.patch(apiUrl('/anomalies/:id'), async ({ request }) => {
        sent.push(await request.json());
        return HttpResponse.json(buildAnomaly({ status: 'DISMISSED' }));
      }),
    );
    renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: t('anomalies.dismiss') }));
    const form = screen
      .getByRole('button', { name: t('anomalies.dismissConfirm') })
      .closest('form');
    expect(form).not.toBeNull();
    await user.click(
      within(form as HTMLElement).getByRole('button', { name: t('anomalies.dismissConfirm') }),
    );
    expect(sent).toHaveLength(0);

    await user.type(
      screen.getByRole('textbox', { name: t('anomalies.dismissLabel') }),
      'La caída fue por la lluvia de ayer',
    );
    await user.click(
      within(form as HTMLElement).getByRole('button', { name: t('anomalies.dismissConfirm') }),
    );
    await waitFor(() => {
      expect(sent).toHaveLength(1);
    });
    expect(sent[0]).toEqual({
      status: 'DISMISSED',
      resolution_note: 'La caída fue por la lluvia de ayer',
    });
  });
});
