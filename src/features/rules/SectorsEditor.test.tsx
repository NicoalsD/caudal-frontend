import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { STATUS } from '../../test/constants';
import {
  buildDraft,
  DRAFT_RULE_SET_ID,
  SECTOR_HIGH_ID,
  SECTOR_LOW_ID,
  SECTOR_SCHOOL_ID,
} from '../../test/factories/rules';
import { buildSessionUser } from '../../test/factories/session';
import { SEED_SECTORS_LIST } from '../../test/factories/network';
import { apiUrl } from '../../test/msw/apiUrl';
import { errorResponse } from '../../test/msw/errorResponse';
import { createRulesBackend } from '../../test/msw/rulesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const DRAFT_PATH = `/junta/reglas/${DRAFT_RULE_SET_ID}`;
const member = () =>
  buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['RULESET_VIEW', 'RULESET_DRAFT'] });

async function openEditor(options: Parameters<typeof createRulesBackend>[0] = {}) {
  const backend = createRulesBackend({ draft: buildDraft(), ...options });
  server.use(...backend.handlers);
  const app = renderApp(DRAFT_PATH, { user: member() });
  await screen.findByRole('heading', { level: 2, name: t('rules.sectorsTitle') });
  return { backend, user: userEvent.setup(), ...app };
}

const sectorOrder = () =>
  screen
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('input[type=checkbox]') !== null)
    .map((item) => item.querySelector('p')?.textContent ?? '');
const up = (name: string) => screen.getByRole('button', { name: `${t('rules.moveUp')}: ${name}` });
const down = (name: string) =>
  screen.getByRole('button', { name: `${t('rules.moveDown')}: ${name}` });
const priorityBox = (name: string) =>
  screen.getByRole('checkbox', { name: `${name}: ${t('rules.sectorPriority')}` });
const save = () => screen.getByRole('button', { name: t('rules.saveDraft') });

describe('SectorsEditor', () => {
  it('lists the sectors by name with the school first because it has priority 1', async () => {
    await openEditor();

    expect(sectorOrder().map((text) => text.split(' (')[0])).toEqual([
      'Sector Escuela',
      'Sector Alto',
      'Sector Bajo',
    ]);
    expect(screen.getByText(t('rules.sectorPriorityRank', { rank: '1' }))).toBeInTheDocument();
    expect(priorityBox('Sector Escuela')).toBeChecked();
    expect(priorityBox('Sector Alto')).not.toBeChecked();
  });

  it('moves a sector with the buttons, announces it and keeps the focus on the same kind of button', async () => {
    const { user } = await openEditor();

    await user.click(down('Sector Escuela'));

    expect(sectorOrder().map((text) => text.split(' (')[0])).toEqual([
      'Sector Alto',
      'Sector Escuela',
      'Sector Bajo',
    ]);
    expect(
      screen.getByText(
        t('rules.sectorMoved', { name: 'Sector Escuela', position: '2', total: '3' }),
      ),
    ).toBeInTheDocument();
    expect(down('Sector Escuela')).toHaveFocus();
  });

  it('disables "Subir" for the first and "Bajar" for the last, and moves the focus to the other button', async () => {
    const { user } = await openEditor();

    expect(up('Sector Escuela')).toBeDisabled();
    expect(down('Sector Bajo')).toBeDisabled();

    await user.click(down('Sector Alto'));
    expect(down('Sector Alto')).toBeDisabled();
    expect(up('Sector Alto')).toHaveFocus();
  });

  it('ranks priority sectors by their place in the list when saving', async () => {
    const { user, backend } = await openEditor();

    await user.click(priorityBox('Sector Alto'));
    await user.click(up('Sector Alto'));
    await user.click(up('Sector Alto'));
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    expect(backend.calls.patches).toEqual([
      {
        sectors: [
          { sector_id: SECTOR_HIGH_ID, is_included: true, is_priority: true, priority_rank: 1 },
          { sector_id: SECTOR_SCHOOL_ID, is_included: true, is_priority: true, priority_rank: 2 },
          { sector_id: SECTOR_LOW_ID, is_included: true, is_priority: false, priority_rank: null },
        ],
      },
    ]);
  });

  it('can stop a sector from receiving shifts', async () => {
    const { user, backend } = await openEditor();

    await user.click(
      screen.getByRole('checkbox', { name: `Sector Bajo: ${t('rules.sectorIncluded')}` }),
    );
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    const saved = backend.state.draft?.sectors.find((sector) => sector.sector_id === SECTOR_LOW_ID);
    expect(saved?.is_included).toBe(false);
  });

  it('sends nothing when the order only changes among sectors without priority, or goes back', async () => {
    const { user, backend } = await openEditor();

    await user.click(down('Sector Escuela'));
    await user.click(up('Sector Escuela'));
    await user.click(down('Sector Alto'));

    expect(sectorOrder().map((text) => text.split(' (')[0])).toEqual([
      'Sector Escuela',
      'Sector Bajo',
      'Sector Alto',
    ]);
    await user.click(save());
    expect(await screen.findByText(t('rules.noChangesToSave'))).toBeInTheDocument();
    expect(backend.calls.patches).toEqual([]);
  });

  it('sends bands and sectors together in one save, only what changed', async () => {
    const { user, backend } = await openEditor();

    await user.click(priorityBox('Sector Bajo'));
    const hours = screen.getByLabelText(`${t('rules.band.high')}: ${t('rules.bandHoursField')}`);
    await user.clear(hours);
    await user.type(hours, '15');
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    expect(Object.keys(backend.calls.patches[0] ?? {}).sort()).toEqual(['bands', 'sectors']);
  });

  it('adds a sector the version does not mention, included and without priority', async () => {
    const draft = buildDraft({ sectors: [] });
    const { user, backend } = await openEditor({ draft });

    expect(
      screen.getAllByRole('checkbox', { name: new RegExp(t('rules.sectorIncluded')) }),
    ).toHaveLength(SEED_SECTORS_LIST.length);
    await user.click(priorityBox('Sector Alto'));
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    expect(backend.state.draft?.sectors).toHaveLength(SEED_SECTORS_LIST.length);
  });

  it('shows a clear error when the sectors cannot be loaded and can retry', async () => {
    let calls = 0;
    server.use(
      ...createRulesBackend({ draft: buildDraft() }).handlers,
      http.get(apiUrl('/sectors'), () => {
        calls += 1;
        return calls === 1
          ? errorResponse(STATUS.badRequest, 'VALIDATION_ERROR')
          : HttpResponse.json({ items: SEED_SECTORS_LIST });
      }),
    );
    renderApp(DRAFT_PATH, { user: member() });

    expect(await screen.findByRole('alert')).toHaveTextContent(t('rules.sectorsLoadError'));
    await userEvent.setup().click(screen.getByRole('button', { name: t('rules.retry') }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: t('rules.sectorsTitle') }),
      ).toBeInTheDocument();
    });
  });
});

describe('sectors in the read-only view', () => {
  it('shows names, rank and who does not receive shifts', async () => {
    const draft = buildDraft({
      sectors: [
        { sector_id: SECTOR_SCHOOL_ID, is_included: true, is_priority: true, priority_rank: 1 },
        { sector_id: SECTOR_HIGH_ID, is_included: false, is_priority: false, priority_rank: null },
      ],
    });
    server.use(...createRulesBackend({ draft }).handlers);
    renderApp(DRAFT_PATH, {
      user: buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['RULESET_VIEW'] }),
    });

    expect(
      await screen.findByText(`Sector Escuela: ${t('rules.sectorPriorityRank', { rank: '1' })}`),
    ).toBeInTheDocument();
    expect(screen.getByText(`Sector Alto: ${t('rules.sectorExcluded')}`)).toBeInTheDocument();
  });
});
