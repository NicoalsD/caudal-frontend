import { strings } from '../src/i18n/es';
import { PUBLIC_SLUG } from './support/constants';
import { expect, test } from './support/fixtures';

test.describe('Horario público', () => {
  test('muestra el horario publicado sin pedir sesión ni datos personales', async ({ page }) => {
    await page.goto(`/a/${PUBLIC_SLUG}`);

    await expect(
      page.getByRole('heading', {
        name: strings.publicSchedule.title.replace('{name}', 'Guaitarilla'),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: strings.publicSchedule.sectorsHeading }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/a/${PUBLIC_SLUG}$`));
  });
});
