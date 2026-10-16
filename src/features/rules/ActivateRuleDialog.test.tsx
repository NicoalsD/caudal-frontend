import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { buildConstraints } from '../../test/factories/constraints';
import { buildDraft, DRAFT_RULE_SET_ID, SEED_BANDS } from '../../test/factories/rules';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createRulesBackend } from '../../test/msw/rulesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const DRAFT_PATH = `/junta/reglas/${DRAFT_RULE_SET_ID}`;
const REASON = 'Se sube la reserva por la temporada seca aprobada en la reunión.';
const STRICT_MIN = 20;
const NINE = 9;
const DOUBLE = 2;
const OVER_MAX = 501;
const NINETY_PERCENT = 450;

const admin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    permissions: ['RULESET_VIEW', 'RULESET_DRAFT', 'RULESET_ACTIVATE'],
  });

async function openDialog(
  options: {
    draft?: ReturnType<typeof buildDraft>;
    user?: ReturnType<typeof admin>;
  } = {},
) {
  const backend = createRulesBackend({ draft: options.draft ?? buildDraft() });
  server.use(...backend.handlers);
  const app = renderApp(DRAFT_PATH, { user: options.user ?? admin() });
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: t('rules.activate') }));
  const dialog = await screen.findByRole('dialog');
  return { backend, user, dialog, ...app };
}

const reasonField = () => screen.getByLabelText(t('rules.reasonLabel'));
const confirm = () => screen.getByRole('button', { name: t('rules.confirmActivate') });

describe('who can activate', () => {
  it('shows the button to BOARD_ADMIN only (the permission comes from /auth/current-user)', async () => {
    server.use(...createRulesBackend({ draft: buildDraft() }).handlers);
    renderApp(DRAFT_PATH, {
      user: buildSessionUser({
        role: 'BOARD_MEMBER',
        permissions: ['RULESET_VIEW', 'RULESET_DRAFT'],
      }),
    });

    await screen.findByRole('button', { name: t('rules.saveDraft') });
    expect(screen.queryByRole('button', { name: t('rules.activate') })).not.toBeInTheDocument();
  });

  it('asks to save first while there are changes not saved', async () => {
    server.use(...createRulesBackend({ draft: buildDraft() }).handlers);
    renderApp(DRAFT_PATH, { user: admin() });
    const user = userEvent.setup();
    const hours = await screen.findByLabelText(
      `${t('rules.band.high')}: ${t('rules.bandHoursField')}`,
    );

    await user.type(hours, '0');

    const activate = screen.getByRole('button', { name: t('rules.activate') });
    expect(activate).toBeDisabled();
    expect(activate).toHaveAccessibleDescription(t('rules.saveBeforeActivating'));
  });

  it('lets the server decide: a client with the permission but a wrong role gets the 403 text', async () => {
    const { user } = await openDialog({
      user: buildSessionUser({
        role: 'BOARD_MEMBER',
        permissions: ['RULESET_VIEW', 'RULESET_DRAFT', 'RULESET_ACTIVATE'],
      }),
    });

    await user.type(reasonField(), REASON);
    await user.click(confirm());

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      t('errors.api.forbidden'),
    );
  });
});

describe('the reason', () => {
  it('opens a dialog with its title, description and the cursor in the reason field', async () => {
    const { dialog } = await openDialog();

    expect(dialog).toHaveAccessibleName(t('rules.activateTitle', { version: '4' }));
    expect(dialog).toHaveAccessibleDescription(t('rules.activateDescription'));
    await waitFor(() => {
      expect(reasonField()).toHaveFocus();
    });
  });

  it('closes with Escape and gives the focus back to the button', async () => {
    const { user } = await openDialog();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: t('rules.activate') })).toHaveFocus();
  });

  it('closes with Cancelar without sending anything', async () => {
    const { user, backend } = await openDialog();

    await user.click(screen.getByRole('button', { name: t('rules.cancel') }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(backend.calls.activations).toHaveLength(0);
  });

  it('requires the reason', async () => {
    const { user, backend } = await openDialog();

    await user.click(confirm());

    expect(await screen.findByText(t('validation.required'))).toBeInTheDocument();
    expect(reasonField()).toHaveAttribute('aria-invalid', 'true');
    expect(backend.calls.activations).toHaveLength(0);
  });

  it('refuses a reason shorter than the minimum of the server', async () => {
    const { user, backend } = await openDialog();

    await user.type(reasonField(), 'x'.repeat(NINE));
    await user.click(confirm());

    expect(await screen.findByText(t('validation.min', { min: 10 }))).toBeInTheDocument();
    expect(backend.calls.activations).toHaveLength(0);
  });

  it('uses the limits the server sends, not 10 and 500 from the code', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        HttpResponse.json(
          buildConstraints({ reason: { min: STRICT_MIN, max: STRICT_MIN * DOUBLE } }),
        ),
      ),
    );
    const { user } = await openDialog();

    expect(
      screen.getByText(t('rules.reasonCounter', { length: '0', max: String(STRICT_MIN * DOUBLE) })),
    ).toBeInTheDocument();
    await user.type(reasonField(), REASON.slice(0, STRICT_MIN - 1));
    await user.click(confirm());

    expect(await screen.findByText(t('validation.min', { min: STRICT_MIN }))).toBeInTheDocument();
  });

  it('refuses a reason longer than the maximum', async () => {
    const { user } = await openDialog();

    await user.click(reasonField());
    await user.paste('x'.repeat(OVER_MAX));
    await user.click(confirm());

    expect(await screen.findByText(t('validation.max', { max: 500 }))).toBeInTheDocument();
  });

  it('counts the characters and keeps counting past 90 %', async () => {
    const { user } = await openDialog();

    await user.click(reasonField());
    await user.paste('x'.repeat(NINETY_PERCENT));

    expect(
      screen.getByText(t('rules.reasonCounter', { length: String(NINETY_PERCENT), max: '500' })),
    ).toBeInTheDocument();
  });
});

describe('activating', () => {
  it('sends only the trimmed reason, then shows the new version as the one in force', async () => {
    const { user, backend, router } = await openDialog();

    await user.type(reasonField(), `  ${REASON}  `);
    await user.click(confirm());

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/junta/reglas');
    });
    expect(backend.calls.activations).toEqual([{ change_reason: REASON }]);
    expect(await screen.findByText(t('rules.activated', { version: '4' }))).toBeInTheDocument();
    expect(await screen.findByText(/Versión 4/)).toBeInTheDocument();
    expect(backend.state.draft).toBeNull();
  });

  it('lists the gaps the server found and keeps the dialog open', async () => {
    const gappy = buildDraft({
      bands: SEED_BANDS.map((band) =>
        band.band === 'LOW' ? { ...band, max_level: 3 } : { ...band },
      ),
    });
    const { user } = await openDialog({ draft: gappy });

    await user.type(reasonField(), REASON);
    await user.click(confirm());

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(t('rules.activationInvalid'))).toBeInTheDocument();
    expect(within(dialog).getByText('Entre 3 y 3,5 no hay banda')).toBeInTheDocument();
  });

  it('puts a server REASON_REQUIRED under the reason field', async () => {
    const { user } = await openDialog();
    server.use(
      http.post(apiUrl('/rule-sets/:id/activate'), () =>
        errorResponse(STATUS.unprocessable, 'REASON_REQUIRED'),
      ),
    );

    await user.type(reasonField(), REASON);
    await user.click(confirm());

    expect(await screen.findByText(t('errors.api.reasonRequired'))).toBeInTheDocument();
    expect(reasonField()).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the support code when the server fails', async () => {
    const { user } = await openDialog();
    server.use(
      http.post(apiUrl('/rule-sets/:id/activate'), () =>
        errorResponse(STATUS.badRequest, 'INTERNAL_ERROR', { requestId: 'req-777' }),
      ),
    );

    await user.type(reasonField(), REASON);
    await user.click(confirm());

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'req-777',
    );
  });

  it('disables the fields and says "Activando..." while the server works', async () => {
    const { user } = await openDialog();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiUrl('/rule-sets/:id/activate'), async () => {
        await gate;
        return errorResponse(STATUS.conflict, 'INVALID_STATE_TRANSITION');
      }),
    );

    await user.type(reasonField(), REASON);
    await user.click(confirm());

    expect(await screen.findByRole('button', { name: t('rules.activating') })).toBeDisabled();
    expect(reasonField()).toBeDisabled();
    release();
    await screen.findByText(t('errors.api.invalidStateTransition'));
  });
});
