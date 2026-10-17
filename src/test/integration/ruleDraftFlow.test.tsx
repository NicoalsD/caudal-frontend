import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import {
  ACTIVE_RULE_SET_ID,
  buildDraft,
  buildRuleSet,
  DRAFT_RULE_SET_ID,
} from '../factories/rules';
import { buildSessionUser } from '../factories/session';
import { createRulesBackend } from '../msw/rulesBackend';
import { server } from '../msw/server';
import { renderApp } from '../renderApp';

type User = ReturnType<typeof userEvent.setup>;

const DRAFT_PATH = ROUTE_PATHS.board.ruleDetail.replace(':id', DRAFT_RULE_SET_ID);
const ACTIVE_VERSION = 7;
const DRAFT_VERSION = ACTIVE_VERSION + 1;
const REASON_MIN = 10;
const SHORT_REASON_LENGTH = 9;
const REASON = 'Se sube la reserva por la temporada seca aprobada en la reunión.';

/** The level that leaves a gap (3 to 3,5) and the one that overlaps (3,5 to 3,6). */
const GAP_TOP = '3';
const OVERLAP_TOP = '3,6';
/** A valid edit: the LOW band ends at 3,4 and the HIGH band starts there. */
const SHARED_LEVEL = '3,4';
const SHARED_LEVEL_VALUE = 3.4;
const OVERLAP_BOTTOM_VALUE = 3.5;

const admin = () =>
  buildSessionUser({
    role: 'BOARD_ADMIN',
    permissions: ['RULESET_VIEW', 'RULESET_DRAFT', 'RULESET_ACTIVATE'],
  });
const member = () =>
  buildSessionUser({
    role: 'BOARD_MEMBER',
    permissions: ['RULESET_VIEW', 'RULESET_DRAFT'],
  });

const field = (band: string, name: string) => screen.getByLabelText(`${band}: ${name}`);
const lowTop = () => field(t('rules.band.low'), t('rules.bandToField'));
const highBottom = () => field(t('rules.band.high'), t('rules.bandFromField'));
const save = () => screen.getByRole('button', { name: t('rules.saveDraft') });
const reasonField = () => screen.getByLabelText(t('rules.reasonLabel'));
const confirm = () => screen.getByRole('button', { name: t('rules.confirmActivate') });
const activateButton = () => screen.queryByRole('button', { name: t('rules.activate') });

async function type(user: User, input: HTMLElement, text: string) {
  await user.clear(input);
  await user.type(input, text);
}

describe('rules draft flow (BOARD_ADMIN)', () => {
  it('reads the rules in force, creates a draft, edits the bands, saves and activates with a reason', async () => {
    const backend = createRulesBackend({ active: buildRuleSet({ version: ACTIVE_VERSION }) });
    server.use(...backend.handlers);
    const { router } = renderApp(ROUTE_PATHS.board.rules, { user: admin() });
    const user = userEvent.setup();

    // 1. The rules in force come from rule-sets/current.
    expect(
      await screen.findByText(
        new RegExp(t('rules.versionLine', { version: String(ACTIVE_VERSION) })),
      ),
    ).toBeInTheDocument();
    const bands = await screen.findByRole('table', { name: t('rules.bandsCaption') });
    expect(
      within(bands).getByRole('rowheader', { name: t('rules.band.high') }),
    ).toBeInTheDocument();

    // 2. Create the draft and land on its editor.
    await user.click(screen.getByRole('button', { name: t('rules.createDraft') }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: t('rules.draftPageTitle', { version: String(DRAFT_VERSION) }),
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/junta/reglas/${DRAFT_RULE_SET_ID}`);
    expect(backend.calls.creations).toBe(1);

    // 3. Overlapping and gapped bands are reported while typing; nothing is sent.
    await type(user, lowTop(), OVERLAP_TOP);
    expect(
      await screen.findByText(t('validation.bandOverlap', { from: '3,5', to: OVERLAP_TOP })),
    ).toBeInTheDocument();
    await type(user, lowTop(), GAP_TOP);
    expect(
      await screen.findByText(t('validation.bandGap', { from: GAP_TOP, to: '3,5' })),
    ).toBeInTheDocument();
    expect(backend.calls.patches).toHaveLength(0);

    // 4. A valid edit of the shared level saves, and the body carries the edited bands.
    await type(user, lowTop(), SHARED_LEVEL);
    await type(user, highBottom(), SHARED_LEVEL);
    await waitFor(() => {
      expect(screen.queryByText(t('rules.bandProblemsTitle'))).not.toBeInTheDocument();
    });
    await user.click(save());
    expect(await screen.findByText(t('rules.draftSaved'))).toBeInTheDocument();

    expect(backend.calls.patches).toHaveLength(1);
    const sent = backend.calls.patches[0]?.bands ?? [];
    expect(sent.find((band) => band.band === 'LOW')).toEqual({
      band: 'LOW',
      min_level: 1.5,
      max_level: SHARED_LEVEL_VALUE,
      daily_service_hours: 8,
      priority_only: false,
    });
    expect(sent.find((band) => band.band === 'HIGH')).toEqual({
      band: 'HIGH',
      min_level: SHARED_LEVEL_VALUE,
      max_level: 5,
      daily_service_hours: 16,
      priority_only: false,
    });

    // 5. Activation asks for a reason; a short one is refused without calling the API.
    await user.click(activateButton()!);
    await screen.findByRole('dialog');
    await type(user, reasonField(), 'x'.repeat(SHORT_REASON_LENGTH));
    await user.click(confirm());
    expect(await screen.findByText(t('validation.min', { min: REASON_MIN }))).toBeInTheDocument();
    expect(backend.calls.activations).toHaveLength(0);

    // A valid reason activates the draft and the screen confirms the version.
    await type(user, reasonField(), REASON);
    await user.click(confirm());

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(ROUTE_PATHS.board.rules);
    });
    expect(backend.calls.activations).toEqual([{ change_reason: REASON }]);
    expect(await screen.findByRole('status')).toHaveTextContent(
      t('rules.activated', { version: String(DRAFT_VERSION) }),
    );
    expect(backend.state.draft).toBeNull();
    expect(backend.state.active.id).toBe(DRAFT_RULE_SET_ID);
  });

  it('an open draft refuses to save overlapping bands and sends nothing', async () => {
    const backend = createRulesBackend({ draft: buildDraft() });
    server.use(...backend.handlers);
    const { router } = renderApp(ROUTE_PATHS.board.rules, { user: admin() });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('link', { name: t('rules.editDraft') }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(DRAFT_PATH);
    });
    await type(user, lowTop(), OVERLAP_TOP);

    expect(
      await screen.findByText(t('validation.bandOverlap', { from: '3,5', to: OVERLAP_TOP })),
    ).toBeInTheDocument();
    await user.click(save());
    expect(backend.calls.patches).toHaveLength(0);
    expect(backend.calls.activations).toHaveLength(0);
    expect(backend.state.draft?.bands.find((band) => band.band === 'LOW')?.max_level).toBe(
      OVERLAP_BOTTOM_VALUE,
    );
    expect(backend.state.active.id).toBe(ACTIVE_RULE_SET_ID);
  });
});

describe('rules draft flow (BOARD_MEMBER)', () => {
  it('saves a draft with an edited level but has no way to activate it', async () => {
    const backend = createRulesBackend({ draft: buildDraft() });
    server.use(...backend.handlers);
    renderApp(DRAFT_PATH, { user: member() });
    const user = userEvent.setup();

    await screen.findByRole('table', { name: t('rules.bandsCaption') });
    expect(activateButton()).not.toBeInTheDocument();

    await type(user, lowTop(), SHARED_LEVEL);
    await type(user, highBottom(), SHARED_LEVEL);
    await user.click(save());

    expect(await screen.findByText(t('rules.draftSaved'))).toBeInTheDocument();
    expect(backend.calls.patches).toHaveLength(1);
    expect(backend.calls.patches[0]?.bands?.find((band) => band.band === 'LOW')?.max_level).toBe(
      SHARED_LEVEL_VALUE,
    );
    expect(activateButton()).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
