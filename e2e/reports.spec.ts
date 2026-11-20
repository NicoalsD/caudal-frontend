import { strings } from '../src/i18n/es';
import { BOARD_ADMIN_USERNAME, SEED_PASSWORD } from './support/constants';
import { expect, test } from './support/fixtures';
import { signIn } from './support/session';

test.describe('Reportes de la Junta', () => {
  test('genera el reporte narrativo y muestra de dónde viene', async ({ page }) => {
    await signIn(page, BOARD_ADMIN_USERNAME, SEED_PASSWORD, /\/junta\/tanque$/);
    await page.goto('/junta/reportes');

    await page.getByRole('button', { name: strings.reports.generate }).click();

    const article = page.getByRole('article');
    await expect(article.getByRole('heading', { name: 'Reporte del periodo' })).toBeVisible();
    await expect(
      article.getByText(
        strings.reports.sourceLine.replace('{source}', strings.assistant.source.rules),
      ),
    ).toBeVisible();
  });
});
