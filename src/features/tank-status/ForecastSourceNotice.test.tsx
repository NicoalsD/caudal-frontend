import { http } from 'msw';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
import { buildForecastRun } from '../../test/factories/status';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const BOARD = buildSessionUser({ role: 'BOARD_MEMBER' });

function renderStatus() {
  return renderApp(ROUTE_PATHS.board.tank, { user: BOARD });
}

describe('ForecastSourceNotice (S12 source of the numbers)', () => {
  it('labels the AI model forecast as such', async () => {
    renderStatus();

    const notice = await screen.findByRole('note');
    expect(notice).toHaveAttribute('data-source', 'AI');
    expect(screen.getByText(t('forecast.sourceAi'))).toBeVisible();
    expect(screen.queryByText(t('forecast.sourceEstimate'))).not.toBeInTheDocument();
  });

  it('shows the ochre "Estimado" notice with the reason when the AI did not answer', async () => {
    server.use(
      http.get(apiUrl('/tanks/:id/forecasts/latest'), () =>
        Response.json(buildForecastRun({ is_fallback: true, fallback_reason: 'IA_TIMEOUT' })),
      ),
    );
    renderStatus();

    const notice = await screen.findByRole('note');
    expect(notice).toHaveAttribute('data-source', 'ESTIMATE');
    expect(screen.getByText(t('forecast.sourceEstimate'))).toBeVisible();
    expect(
      screen.getByText(t('forecast.sourceEstimateText', { reason: t('forecast.reasonTimeout') })),
    ).toBeVisible();
    expect(screen.queryByText(t('forecast.sourceAi'))).not.toBeInTheDocument();
  });
});
