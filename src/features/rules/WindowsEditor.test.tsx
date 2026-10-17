import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { buildConstraints } from '../../test/factories/constraints';
import { buildDraft, DRAFT_RULE_SET_ID } from '../../test/factories/rules';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { createRulesBackend } from '../../test/msw/rulesBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const DRAFT_PATH = `/junta/reglas/${DRAFT_RULE_SET_ID}`;
const MAX_WINDOWS = 2;
const GROUPS = 8;
const SECOND = 1;
const TWO_ERRORS = 2;

async function openEditor(options: Parameters<typeof createRulesBackend>[0] = {}) {
  const backend = createRulesBackend({ draft: buildDraft(), ...options });
  server.use(...backend.handlers);
  const app = renderApp(DRAFT_PATH, {
    user: buildSessionUser({
      role: 'BOARD_MEMBER',
      permissions: ['RULESET_VIEW', 'RULESET_DRAFT'],
    }),
  });
  await screen.findByRole('heading', { level: 2, name: t('rules.editWindowsTitle') });
  return { backend, user: userEvent.setup(), ...app };
}

const group = (day: string) => screen.getByRole('group', { name: day });
const save = () => screen.getByRole('button', { name: t('rules.saveDraft') });
const add = (day: string) =>
  screen.getByRole('button', { name: `${t('rules.addWindow')}: ${day}` });
const times = (day: string) => ({
  start: (index = 0) => within(group(day)).getAllByLabelText(t('rules.windowStart'))[index]!,
  end: (index = 0) => within(group(day)).getAllByLabelText(t('rules.windowEnd'))[index]!,
});

function setTime(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe('WindowsEditor', () => {
  it('shows each day as a group and the existing window under "Todos los días"', async () => {
    await openEditor();

    expect(times(t('rules.day.all')).start()).toHaveValue('05:00');
    expect(times(t('rules.day.all')).end()).toHaveValue('21:00');
    expect(
      within(group(t('rules.day.d1'))).getByText(t('rules.noWindowsForDay')),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(GROUPS);
  });

  it('adds a window for one day and sends it with the day number and HH:MM times', async () => {
    const { user, backend } = await openEditor();
    const saturday = t('rules.day.d6');

    await user.click(add(saturday));
    setTime(times(saturday).start(), '06:30');
    setTime(times(saturday).end(), '12:00');
    await user.click(save());

    await screen.findByText(t('rules.draftSaved'));
    expect(backend.calls.patches).toEqual([
      {
        operating_windows: [
          { day_of_week: null, start_time: '05:00', end_time: '21:00' },
          { day_of_week: 6, start_time: '06:30', end_time: '12:00' },
        ],
      },
    ]);
  });

  it('puts the cursor on the new window', async () => {
    const { user } = await openEditor();

    await user.click(add(t('rules.day.d2')));

    expect(times(t('rules.day.d2')).start()).toHaveFocus();
  });

  it('asks for a time when a field is left empty', async () => {
    const { user, backend } = await openEditor();
    await user.click(add(t('rules.day.d1')));

    await user.click(save());

    expect((await screen.findAllByText(t('validation.time'))).length).toBe(TWO_ERRORS);
    expect(backend.calls.patches).toHaveLength(0);
  });

  it('marks an end that is not after the start', async () => {
    const { user } = await openEditor();
    const all = t('rules.day.all');

    setTime(times(all).end(), '05:00');
    await user.click(save());

    expect(await screen.findByText(t('validation.windowOrder'))).toBeInTheDocument();
    expect(times(all).end()).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks two windows of the same day that cross, but not ones that only touch', async () => {
    const { user, backend } = await openEditor();
    const monday = t('rules.day.d1');
    await user.click(add(monday));
    setTime(times(monday).start(), '05:00');
    setTime(times(monday).end(), '10:00');
    await user.click(add(monday));
    setTime(times(monday).start(SECOND), '09:00');
    setTime(times(monday).end(SECOND), '12:00');

    await user.click(save());
    expect((await screen.findAllByText(t('validation.windowOverlap'))).length).toBe(TWO_ERRORS);
    expect(backend.calls.patches).toHaveLength(0);

    setTime(times(monday).start(SECOND), '10:00');
    await user.click(save());
    await screen.findByText(t('rules.draftSaved'));
  });

  it('removes a window, announces it and moves the focus to the add button of that day', async () => {
    const { user, backend } = await openEditor();
    const all = t('rules.day.all');

    await user.click(screen.getByRole('button', { name: `${t('rules.removeWindow')}: ${all}` }));

    expect(screen.getByText(t('rules.windowRemoved', { day: all }))).toBeInTheDocument();
    expect(add(all)).toHaveFocus();
    await user.click(save());
    await screen.findByText(t('rules.draftSaved'));
    expect(backend.calls.patches).toEqual([{ operating_windows: [] }]);
  });

  it('caps the number of windows with the maximum the server sends', async () => {
    server.use(
      http.get(apiUrl('/meta/constraints'), () =>
        HttpResponse.json(buildConstraints({ 'rule_set.operating_windows': { max: MAX_WINDOWS } })),
      ),
    );
    const { user, backend } = await openEditor();
    const monday = t('rules.day.d1');
    const slots = [
      ['05:00', '06:00'],
      ['12:00', '13:00'],
    ] as const;
    for (const [index, [from, to]] of slots.entries()) {
      await user.click(add(monday));
      setTime(times(monday).start(index), from);
      setTime(times(monday).end(index), to);
    }
    await user.click(save());

    expect(
      await screen.findByText(t('validation.tooManyItems', { max: String(MAX_WINDOWS) })),
    ).toBeInTheDocument();
    expect(backend.calls.patches).toHaveLength(0);
  });

  it('does not invent a maximum when the server sends none', async () => {
    const { user, backend } = await openEditor();
    const monday = t('rules.day.d1');
    const slots = [
      ['01:00', '01:30'],
      ['02:00', '02:30'],
      ['03:00', '03:30'],
    ] as const;
    expect(slots.length).toBeGreaterThan(MAX_WINDOWS);
    for (const [index, [start, end]] of slots.entries()) {
      await user.click(add(monday));
      setTime(times(monday).start(index), start);
      setTime(times(monday).end(index), end);
    }

    await user.click(save());

    await waitFor(() => {
      expect(backend.calls.patches).toHaveLength(1);
    });
  });

  it('keeps save off until something changes', async () => {
    await openEditor();

    expect(save()).toBeDisabled();
  });
});
