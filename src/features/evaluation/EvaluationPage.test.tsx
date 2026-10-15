import { http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildForecastEvaluation } from '../../test/factories/evaluation';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const TEAM = buildSessionUser({ role: 'PROJECT_TEAM' });

function cardOf(title: string): HTMLElement {
  return screen.getByRole('heading', { level: 3, name: title }).closest('li') as HTMLElement;
}

describe('EvaluationPage (S23)', () => {
  it('answers the question in plain words first, then shows the metrics side by side', async () => {
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    expect(
      await screen.findByRole('heading', { level: 2, name: t('evaluation.headlineHelps') }),
    ).toBeVisible();
    const maeCard = cardOf(t('evaluation.maeTitle'));
    expect(within(maeCard).getByText('0,12 m')).toBeVisible();
    expect(within(maeCard).getByText('0,15 m')).toBeVisible();
    expect(within(cardOf(t('evaluation.coverageTitle'))).getByText('76 %')).toBeVisible();
  });

  it('shows the skill of every horizon against the simple estimate, positive when the AI is better', async () => {
    const SKILL_BETTER = 0.2;
    const SKILL_WORSE = -0.1;
    const WORSE_HORIZONS = 2;
    server.use(
      http.get(apiUrl('/forecast-evaluation'), ({ request }) => {
        const horizon = Number(new URL(request.url).searchParams.get('horizon_days'));
        const skill = horizon === 1 ? SKILL_BETTER : SKILL_WORSE;
        return HttpResponse.json(buildForecastEvaluation({ horizon_days: horizon, skill }));
      }),
    );
    renderApp(ROUTE_PATHS.team.evaluation, { user: TEAM });

    const table = await screen.findByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: t('evaluation.skillColumn') }),
    ).toBeVisible();
    expect(
      within(table).getByRole('rowheader', { name: t('evaluation.horizonOne') }),
    ).toBeVisible();
    expect(within(table).getByText('+20 %')).toBeVisible();
    expect(within(table).getAllByText('-10 %')).toHaveLength(WORSE_HORIZONS);
  });
});
