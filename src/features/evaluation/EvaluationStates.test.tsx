import { delay, http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildForecastEvaluation } from '../../test/factories/evaluation';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TEAM = buildSessionUser({ role: 'PROJECT_TEAM' });
const BOARD_ADMIN = buildSessionUser({ role: 'BOARD_ADMIN' });
const INTERNAL_ERROR = 500;

/** Answers every horizon with the same evaluation, so each test states the case it checks. */
function answerWith(overrides: Parameters<typeof buildForecastEvaluation>[0]): void {
  server.use(
    http.get(apiUrl('/forecast-evaluation'), ({ request }) => {
      const horizon = Number(new URL(request.url).searchParams.get('horizon_days'));
      return HttpResponse.json(buildForecastEvaluation({ horizon_days: horizon, ...overrides }));
    }),
  );
}

describe('EvaluationPage states (S23)', () => {
  it('says the AI helps when it beats the simple estimate with enough evidence', async () => {
    answerWith({ helps: true, skill: 0.2 });
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(
      await screen.findByRole('heading', { level: 2, name: t('evaluation.headlineHelps') }),
    ).toBeVisible();
    expect(screen.getAllByText('+20 %').length).toBeGreaterThan(0);
  });

  it('says the AI does not help when it is worse than the simple estimate', async () => {
    answerWith({ helps: false, skill: -0.1, mae_ia: 0.2, mae_simple: 0.18 });
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(
      await screen.findByRole('heading', { level: 2, name: t('evaluation.headlineDoesNotHelp') }),
    ).toBeVisible();
    expect(screen.getAllByText('-10 %').length).toBeGreaterThan(0);
  });

  it('gives no verdict and no skill when the sample is insufficient', async () => {
    const SAMPLE_SO_FAR = 4;
    answerWith({ n: SAMPLE_SO_FAR, helps: null, skill: null, mae_ia: null, mae_simple: null });
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(
      await screen.findByText(t('evaluation.insufficient', { count: SAMPLE_SO_FAR })),
    ).toBeVisible();
    expect(screen.queryByText(t('evaluation.headlineHelps'))).not.toBeInTheDocument();
    expect(screen.queryByText(t('evaluation.headlineDoesNotHelp'))).not.toBeInTheDocument();
  });

  it('shows a loading message while the evaluation is on its way', async () => {
    server.use(
      http.get(apiUrl('/forecast-evaluation'), async () => {
        await delay('infinite');
        return HttpResponse.json(buildForecastEvaluation());
      }),
    );
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(await screen.findByText(t('evaluation.loading'))).toBeVisible();
  });

  it('offers a retry when the evaluation fails, and shows it once the retry works', async () => {
    const RETRY_WAIT_MS = 10_000;
    server.use(
      http.get(apiUrl('/forecast-evaluation'), () =>
        errorResponse(INTERNAL_ERROR, 'INTERNAL_ERROR'),
      ),
    );
    renderApp(ROUTE_PATHS.team.evaluation, { user: BOARD_ADMIN });
    const user = userEvent.setup();

    const retry = await screen.findByRole(
      'button',
      { name: t('common.retry') },
      { timeout: RETRY_WAIT_MS },
    );
    answerWith({});
    await user.click(retry);

    expect(
      await screen.findByRole('heading', { level: 2, name: t('evaluation.headlineHelps') }),
    ).toBeVisible();
  });

  it('says there are no evaluated forecasts yet when no horizon has a forecast', async () => {
    answerWith({
      n: 0,
      helps: null,
      skill: null,
      mae_ia: null,
      mae_simple: null,
      coverage_80: null,
    });
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(await screen.findByText(t('evaluation.empty'))).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
