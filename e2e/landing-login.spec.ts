import { strings } from '../src/i18n/es';
import { BOARD_ADMIN_USERNAME, OPERATOR_USERNAME, SEED_PASSWORD } from './support/constants';
import { expect, expectNoSeriousViolations, test } from './support/fixtures';

test.describe('Entrada a la aplicación', () => {
  test('la portada lleva a la demo y el login rechaza una contraseña incorrecta', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('link', { name: strings.landing.nav.demo }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: strings.screens.login })).toBeVisible();

    await page.getByLabel(strings.auth.username, { exact: true }).fill(OPERATOR_USERNAME);
    await page
      .getByLabel(strings.auth.password, { exact: true })
      .fill('contrasena-equivocada-larga');
    await page.getByRole('button', { name: strings.auth.signIn }).click();

    // The same generic sentence for any 401: the screen never reveals whether the user exists.
    await expect(page.getByText(strings.errors.api.invalidCredentials)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('el login entra como fontanero con la contraseña correcta', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(strings.auth.username, { exact: true }).fill(OPERATOR_USERNAME);
    await page.getByLabel(strings.auth.password, { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: strings.auth.signIn }).click();

    await expect(page).toHaveURL(/\/operador\/inicio$/);
  });

  test('la Junta entra a su tablero de tanque', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(strings.auth.username, { exact: true }).fill(BOARD_ADMIN_USERNAME);
    await page.getByLabel(strings.auth.password, { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: strings.auth.signIn }).click();

    await expect(page).toHaveURL(/\/junta\/tanque$/);
  });

  test('la portada y el login cumplen WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoSeriousViolations(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: strings.screens.login })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
