import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import { buildSessionUser } from '../../test/factories/session';
import { buildDraft, DRAFT_RULE_SET_ID } from '../../test/factories/rules';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createRulesBackend } from '../../test/msw/rulesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const DRAFT_PATH = `/junta/reglas/${DRAFT_RULE_SET_ID}`;
const member = () =>
  buildSessionUser({
    role: 'BOARD_MEMBER',
    permissions: ['RULESET_VIEW', 'RULESET_DRAFT'],
  });

type User = ReturnType<typeof userEvent.setup>;

async function openEditor(options: Parameters<typeof createRulesBackend>[0] = {}) {
  const backend = createRulesBackend({ draft: buildDraft(), ...options });
  server.use(...backend.handlers);
  const app = renderApp(DRAFT_PATH, { user: member() });
  await screen.findByRole('table', { name: t('rules.bandsCaption') });
  return { backend, user: userEvent.setup(), ...app };
}

const field = (band: string, name: string) => screen.getByLabelText(`${band}: ${name}`);
const lowTop = () => field(t('rules.band.low'), t('rules.bandToField'));
const save = () => screen.getByRole('button', { name: t('rules.saveDraft') });

async function type(user: User, input: HTMLElement, text: string) {
  await user.clear(input);
  await user.type(input, text);
}

describe('BandsEditor', () => {
  it('shows every band with accessible names and the values of the draft', async () => {
    await openEditor();

    expect(field(t('rules.band.high'), t('rules.bandFromField'))).toHaveValue('3,5');
    expect(field(t('rules.band.high'), t('rules.bandToField'))).toHaveValue('5');
    expect(field(t('rules.band.high'), t('rules.bandHoursField'))).toHaveValue('16');
    expect(field(t('rules.band.critical'), t('rules.bandFromField'))).toHaveValue('0');
    expect(
      screen
        .getAllByRole('checkbox', { name: t('rules.bandPriorityOnly') })
        .map((box) => (box as HTMLInputElement).checked),
    ).toEqual([false, false, true]);
  });

  it('explains the gap as the person types and does not send anything', async () => {
    const { user, backend } = await openEditor();

    await type(user, lowTop(), '3');

    expect(await screen.findByText(/Entre 3 y 3,5 no hay banda/)).toBeInTheDocument();
    await user.click(save());
    await waitFor(() => {
      expect(screen.getByText(/Entre 3 y 3,5 no hay banda/)).toBeInTheDocument();
    });
    expect(backend.calls.patches).toHaveLength(0);
  });

  it('explains the overlap', async () => {
    const { user } = await openEditor();

    await type(user, lowTop(), '3,6');

    expect(await screen.findByText(/Entre 3,5 y 3,6 hay dos bandas/)).toBeInTheDocument();
  });

  it('marks the field whose top is not above its bottom', async () => {
    const { user } = await openEditor();

    await type(user, lowTop(), '1');
    await user.click(save());

    expect(
      await screen.findByText(t('validation.bandOrder'), { selector: 'p' }),
    ).toBeInTheDocument();
    expect(lowTop()).toHaveAttribute('aria-invalid', 'true');
    expect(lowTop()).toHaveFocus();
  });

  it('refuses a level outside the tank range of the rule set', async () => {
    const { user } = await openEditor();

    await type(user, field(t('rules.band.high'), t('rules.bandToField')), '6');
    await user.click(save());

    expect(await screen.findByText(t('validation.rangeMax', { max: '5' }))).toBeInTheDocument();
  });

  it('uses the tank range the server sent, not a fixed one', async () => {
    const wide = buildDraft({
      gauge: { min: 0, max: 8, step: 0.01 },
      bands: [
        { band: 'HIGH', min_level: 0, max_level: 8, daily_service_hours: 10, priority_only: false },
      ],
    });
    const { user, backend } = await openEditor({ draft: wide });

    await type(user, field(t('rules.band.high'), t('rules.bandHoursField')), '12');
    await user.click(save());

    await waitFor(() => {
      expect(backend.calls.patches).toHaveLength(1);
    });
  });

  it('accepts decimal comma and decimal point and sends only the changed bands list', async () => {
    const { user, backend } = await openEditor();

    await type(user, field(t('rules.band.high'), t('rules.bandHoursField')), '14.5');
    await type(user, field(t('rules.band.low'), t('rules.bandHoursField')), '7,25');
    await user.click(save());

    expect(await screen.findByText(t('rules.draftSaved'))).toBeInTheDocument();
    expect(backend.calls.patches).toEqual([
      {
        bands: [
          {
            band: 'HIGH',
            min_level: 3.5,
            max_level: 5,
            daily_service_hours: 14.5,
            priority_only: false,
          },
          {
            band: 'LOW',
            min_level: 1.5,
            max_level: 3.5,
            daily_service_hours: 7.25,
            priority_only: false,
          },
          {
            band: 'CRITICAL',
            min_level: 0,
            max_level: 1.5,
            daily_service_hours: 3,
            priority_only: true,
          },
        ],
      },
    ]);
  });

  it('saves a change of the "only priority" checkbox', async () => {
    const { user, backend } = await openEditor();

    const [, lowBox] = screen.getAllByRole('checkbox', { name: t('rules.bandPriorityOnly') });
    await user.click(lowBox!);
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    expect(backend.state.draft?.bands.find((band) => band.band === 'LOW')?.priority_only).toBe(
      true,
    );
  });

  it('keeps the save button off, with a reason, until something changes', async () => {
    const { user } = await openEditor();

    expect(save()).toBeDisabled();
    expect(screen.getByText(t('rules.noChangesToSave'))).toBeInTheDocument();
    expect(save()).toHaveAccessibleDescription(t('rules.noChangesToSave'));

    await type(user, field(t('rules.band.high'), t('rules.bandHoursField')), '15');

    expect(save()).toBeEnabled();
  });

  it('shows the server answer when it refuses the save', async () => {
    const { user } = await openEditor();
    server.use(
      http.patch(apiUrl('/rule-sets/:id'), () =>
        errorResponse(STATUS.conflict, 'RULE_SET_IMMUTABLE'),
      ),
    );

    await type(user, field(t('rules.band.high'), t('rules.bandHoursField')), '15');
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.api.ruleSetImmutable'));
    expect(screen.queryByText(t('rules.draftSaved'))).not.toBeInTheDocument();
  });

  it('opens read-only for someone who cannot edit drafts', async () => {
    server.use(...createRulesBackend({ draft: buildDraft() }).handlers);
    renderApp(DRAFT_PATH, {
      user: buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['RULESET_VIEW'] }),
    });

    expect(await screen.findByText(t('rules.readOnlyNotice'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t('rules.saveDraft') })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('is reachable by keyboard: tab goes from one field to the next in reading order', async () => {
    const { user } = await openEditor();

    field(t('rules.band.high'), t('rules.bandFromField')).focus();
    await user.tab();

    expect(field(t('rules.band.high'), t('rules.bandToField'))).toHaveFocus();
  });
});
