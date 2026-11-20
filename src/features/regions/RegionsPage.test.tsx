import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { SEED_SECTORS_LIST } from '../../test/factories/network';
import { buildSessionUser } from '../../test/factories/session';
import { apiUrl } from '../../test/msw/apiUrl';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

const ADMIN = buildSessionUser({
  role: 'BOARD_ADMIN',
  permissions: ['NETWORK_VIEW', 'NETWORK_MANAGE'],
});
const MEMBER = buildSessionUser({ role: 'BOARD_MEMBER', permissions: ['NETWORK_VIEW'] });

describe('Regions editor', () => {
  it('creates a region without a parent', async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(apiUrl('/sectors'), async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          { ...SEED_SECTORS_LIST[0], id: 'new', code: 'NORTE', name: 'Norte' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.regions, { user: ADMIN });

    const form = await screen.findByRole('form', { name: t('regions.createTitle') });
    await user.type(await within(form).findByLabelText(t('regions.codeLabel')), 'norte');
    await user.type(within(form).getByLabelText(t('regions.nameLabel')), 'Norte');
    await user.click(within(form).getByRole('button', { name: t('regions.createSubmit') }));

    await waitFor(() => {
      expect(bodies).toEqual([{ code: 'NORTE', name: 'Norte' }]);
    });
  });

  it('moves a sector under another one and offers every sector but itself', async () => {
    const patches: unknown[] = [];
    server.use(
      http.patch(apiUrl('/sectors/:id'), async ({ request }) => {
        patches.push(await request.json());
        return HttpResponse.json(SEED_SECTORS_LIST[0]);
      }),
    );
    const user = userEvent.setup();
    renderApp(ROUTE_PATHS.board.regions, { user: ADMIN });

    const row = (await screen.findByText(/Sector Escuela \(ESCUELA\)/)).closest('li');
    expect(row).not.toBeNull();
    await user.click(
      within(row as HTMLElement).getAllByRole('button', { name: t('regions.move') })[0]!,
    );
    const select = await screen.findByLabelText(t('regions.parentLabel'));
    const options = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options).toContain('Sector Alto (ALTO)');
    expect(options).not.toContain('Sector Escuela (ESCUELA)');

    await user.selectOptions(select, 'Sector Alto (ALTO)');
    await user.click(screen.getByRole('button', { name: t('regions.moveSubmit') }));

    await waitFor(() => {
      expect(patches).toEqual([{ parent_sector_id: SEED_SECTORS_LIST[1]?.id }]);
    });
  });

  it('is closed to a Board member', async () => {
    renderApp(ROUTE_PATHS.board.regions, { user: MEMBER });

    expect(await screen.findByText(t('errors.forbiddenTitle'))).toBeVisible();
  });
});
