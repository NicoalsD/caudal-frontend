import { strings } from '../src/i18n/es';
import { BOARD_ADMIN_USERNAME, SEED_PASSWORD } from './support/constants';
import { expect, test } from './support/fixtures';
import { signIn } from './support/session';

const BOARD_TANK = /\/junta\/tanque$/;

test.describe('Junta', () => {
  test('revisa la propuesta del tanque, la aprueba y la publica', async ({ page, api }) => {
    await signIn(page, BOARD_ADMIN_USERNAME, SEED_PASSWORD, BOARD_TANK);
    await expect(page.getByRole('heading', { name: strings.screens.tankStatus })).toBeVisible();

    // The day's next step leads to the proposal of today.
    await page.getByRole('button', { name: strings.proposals.guide.review }).click();
    await expect(page).toHaveURL(/\/junta\/propuestas\/[^/]+$/);
    await expect(page.getByRole('heading', { name: strings.screens.proposalDetail })).toBeVisible();

    await page.getByRole('button', { name: strings.proposals.actions.approve }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: strings.proposals.approve.confirm })
      .click();
    await expect.poll(() => api.state.proposalStatus).toBe('APPROVED');

    await page.getByRole('button', { name: strings.proposals.actions.publish }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: strings.proposals.publication.confirm })
      .click();
    await expect.poll(() => api.state.proposalStatus).toBe('PUBLISHED');
  });
});
