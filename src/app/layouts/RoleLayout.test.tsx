import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { TEST_USERS } from '../../test/factories/auth';
import { createSessionBackend } from '../../test/msw/sessionBackend';
import { server } from '../../test/msw/server';
import { renderApp } from '../../test/renderApp';

async function openOperatorShell() {
  server.use(...createSessionBackend(TEST_USERS.operator).handlers);
  const view = renderApp(ROUTE_PATHS.operator.home);
  await view.services.session.restore();
  await screen.findByRole('navigation', { name: t('app.mainNavigation') });
  return view;
}

describe('app shell', () => {
  it('keeps the skip link and the banner, navigation and main landmarks', async () => {
    await openOperatorShell();

    expect(screen.getByRole('link', { name: t('app.skipToContent') })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('main')).toBeVisible();
    const nav = screen.getByRole('navigation', { name: t('app.mainNavigation') });
    expect(within(nav).getByRole('link', { name: t('nav.newReading') })).toBeVisible();
  });

  it('draws the screen title (the only h1) in the banner', async () => {
    await openOperatorShell();

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(within(screen.getByRole('banner')).getByRole('heading', { level: 1 })).toBe(heading);
  });

  it('opens a command palette that filters the screens of the role and navigates', async () => {
    const user = userEvent.setup();
    const { router } = await openOperatorShell();

    await user.click(
      within(screen.getByRole('banner')).getAllByRole('button', { name: t('shell.search') })[0]!,
    );
    const box = await screen.findByRole('combobox', { name: t('shell.searchLabel') });
    await user.type(box, 'pendi');
    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(t('nav.pending'));
    await user.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe(ROUTE_PATHS.operator.pending);
  });

  it('says so when no screen matches the search', async () => {
    const user = userEvent.setup();
    await openOperatorShell();

    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'zzz');

    expect(screen.getByText(t('shell.searchEmpty'))).toBeVisible();
  });

  it('keeps the sign out inside the user menu', async () => {
    const user = userEvent.setup();
    await openOperatorShell();

    expect(screen.queryByRole('button', { name: t('auth.signOut') })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /^Menú de / }));
    expect(screen.getByRole('button', { name: t('auth.signOut') })).toBeVisible();
  });
});
