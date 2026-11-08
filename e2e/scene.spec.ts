import { strings } from '../src/i18n/es';
import { OPERATOR_USERNAME, SEED_PASSWORD } from './support/constants';
import { expect, expectNoSeriousViolations, test } from './support/fixtures';
import { openOperatorPanel, signIn } from './support/session';

const HOME = /\/operador\/inicio$/;
const HIGH_VALVE_NAME = 'Válvula alta';
const REASON = 'El sector Alto necesita agua para el turno de la tarde.';
const SCENE_TIMEOUT_MS = 20_000;
const COMMAND_TIMEOUT_MS = 20_000;
const TWO_SECONDS_MS = 2000;

test.describe('Escena 3D del fontanero', () => {
  test('dibuja la escena, abre una llave y sigue el comando hasta la confirmación', async ({
    page,
    api,
  }) => {
    await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, HOME);
    await expect(page.getByTestId('aqueduct-scene')).toHaveAttribute('data-ready', 'true', {
      timeout: SCENE_TIMEOUT_MS,
    });
    await openOperatorPanel(page);

    await page.getByRole('button', { name: `Abrir la llave ${HIGH_VALVE_NAME}` }).click();
    const dialog = page.getByRole('dialog', { name: `Llave ${HIGH_VALVE_NAME}` });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(strings.valveControl.reasonLabel).fill(REASON);
    await dialog.getByRole('button', { name: strings.valveControl.confirmOpen }).click();

    await expect(dialog.getByText(strings.valveControl.doneAcked)).toBeVisible({
      timeout: COMMAND_TIMEOUT_MS,
    });
    expect(api.state.valveCommands).toHaveLength(1);
    expect(api.state.valveCommands[0]).toMatchObject({
      command: 'OPEN',
      manual_reason: REASON,
    });
    await dialog.getByRole('button', { name: strings.valveControl.back }).click();
    await expect(page.getByText(`${HIGH_VALVE_NAME}`, { exact: true }).first()).toBeVisible();
    await page.waitForTimeout(TWO_SECONDS_MS);
    await expect(page.getByText(strings.valves.state.open).first()).toBeVisible();
  });

  test('acepta una recomendación del asistente', async ({ page, api }) => {
    await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, HOME);
    await openOperatorPanel(page);

    await page.getByRole('button', { name: strings.assistant.accept }).click();

    await expect(page.getByText(strings.assistant.empty)).toBeVisible();
    expect(api.state.decisionStatus).toBe('ACCEPTED');
  });

  test('la pantalla de inicio no tiene violaciones graves y no se desborda a los lados', async ({
    page,
  }) => {
    await signIn(page, OPERATOR_USERNAME, SEED_PASSWORD, HOME);
    await expect(page.getByTestId('aqueduct-scene')).toBeVisible();
    await openOperatorPanel(page);
    await expectNoSeriousViolations(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
