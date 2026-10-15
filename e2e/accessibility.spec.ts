import { strings } from '../src/i18n/es';
import {
  BOARD_ADMIN_USERNAME,
  OPERATOR_USERNAME,
  PUBLIC_SLUG,
  SEED_PASSWORD,
} from './support/constants';
import { expect, expectNoSeriousViolations, test } from './support/fixtures';
import { signIn } from './support/session';

test.describe('Accesibilidad (axe, WCAG 2.1 AA)', () => {
  test('pantallas públicas y de acceso', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto(`/a/${PUBLIC_SLUG}`);
    await expect(
      page.getByRole('heading', {
        name: strings.publicSchedule.title.replace('{name}', 'Guaitarilla'),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: strings.publicSchedule.sectorsHeading }),
    ).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('pantallas del fontanero', async ({ page }) => {
    await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, /\/operador\/inicio$/);
    await expect(page.getByRole('link', { name: strings.home.newReading })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.getByRole('link', { name: strings.home.newReading }).click();
    await expect(page.getByLabel(strings.readings.gaugeLabel)).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test('pantallas de la Junta', async ({ page }) => {
    await signIn(page, BOARD_ADMIN_USERNAME, SEED_PASSWORD, /\/junta\/tanque$/);
    await expect(page.getByRole('heading', { name: strings.screens.tankStatus })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/junta/propuestas');
    await expect(page.getByRole('heading', { name: strings.screens.proposals })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
