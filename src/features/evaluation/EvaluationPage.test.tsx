import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { buildSessionUser } from '../../test/factories/session';
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
});
