import { strings } from '../src/i18n/es';
import { OPERATOR_USERNAME, SEED_PASSWORD } from './support/constants';
import { setConnection } from './support/api';
import { expect, test } from './support/fixtures';
import { goToNavLink, signIn } from './support/session';

const HOME = /\/operador\/inicio$/;
const NEW_READING = /\/operador\/lectura\/nueva$/;
const PENDING = /\/operador\/pendientes$/;
const GAUGE_VALUE = '2,1';
const APPEARANCE_NORMAL = 'Normal';
const GAUGE_NUMBER = 2.1;

test.describe('Fontanero', () => {
  test('registra una lectura sin señal, la ve en pendientes y se envía al volver la red', async ({
    page,
    context,
    api,
  }) => {
    await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, HOME);

    // Open the form while online, so its options (the water appearance catalog) are loaded.
    await page.getByRole('link', { name: strings.home.newReading }).click();
    await expect(page).toHaveURL(NEW_READING);
    await expect(page.getByRole('radio', { name: APPEARANCE_NORMAL })).toBeVisible();

    await setConnection(context, api, false);

    await page.getByLabel(strings.readings.gaugeLabel).fill(GAUGE_VALUE);
    await page.getByRole('radio', { name: APPEARANCE_NORMAL }).check();
    await page.getByRole('button', { name: strings.readings.submit }).click();
    await expect(page.getByText(strings.readings.savedOffline)).toBeVisible();
    expect(api.state.batches).toHaveLength(0);

    await goToNavLink(page, strings.nav.pending);
    await expect(page).toHaveURL(PENDING);
    await expect(page.getByText(`Nivel ${GAUGE_VALUE}`)).toBeVisible();
    await expect(page.getByText(strings.pending.status.pending, { exact: true })).toBeVisible();

    await setConnection(context, api, true);
    // The flush runs by itself once the network is back: the row moves to the sent list.
    await expect(page.getByText(strings.readings.sent.status, { exact: true })).toBeVisible();
    expect(api.state.batches).toHaveLength(1);
    expect(api.state.batches[0]?.readings[0]?.gauge_value).toBe(GAUGE_NUMBER);
  });
});
