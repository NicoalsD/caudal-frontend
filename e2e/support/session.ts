import type { Page } from '@playwright/test';

import { strings } from '../../src/i18n/es';
import { expect } from './fixtures';

/** Signs in through the real login form and waits for the first screen of the role. */
export async function signIn(
  page: Page,
  username: string,
  password: string,
  firstScreen: RegExp,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(strings.auth.username, { exact: true }).fill(username);
  await page.getByLabel(strings.auth.password, { exact: true }).fill(password);
  await page.getByRole('button', { name: strings.auth.signIn }).click();
  await expect(page).toHaveURL(firstScreen);
}

/**
 * Follows a link of the main navigation. On a narrow screen the links fold behind the "Menú"
 * button, so the menu opens first when the button is there.
 */
export async function goToNavLink(page: Page, name: string): Promise<void> {
  const menu = page.getByRole('button', { name: strings.app.menu });
  if (await menu.isVisible()) {
    await menu.click();
  }
  await page
    .getByRole('navigation', { name: strings.app.mainNavigation })
    .getByRole('link', { name })
    .click();
}
