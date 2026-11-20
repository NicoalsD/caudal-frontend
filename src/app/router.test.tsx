import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Role } from '../core/session/roles';
import { ROUTE_PATHS } from '../core/session/routes';
import { t } from '../i18n/t';
import { buildSessionUser } from '../test/factories/session';
import { renderApp } from '../test/renderApp';

function renderAt(path: string, role?: Role) {
  return renderApp(path, role === undefined ? {} : { user: buildSessionUser({ role }) }).router;
}

/** Screens load on demand, so their heading arrives a moment after the route settles. */
const heading = (name: string | RegExp) => screen.findByRole('heading', { level: 1, name });

describe('role router', () => {
  it('shows the public schedule without a session', async () => {
    renderAt('/a/vereda-de-prueba');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: t('publicSchedule.title', { name: 'Guaitarilla' }),
      }),
    ).toBeInTheDocument();
  });

  it('sends anonymous visitors of a private route to login keeping the next path', async () => {
    const router = renderAt(ROUTE_PATHS.operator.pending);

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    expect(router.state.location.search).toBe(
      `?next=${encodeURIComponent(ROUTE_PATHS.operator.pending)}`,
    );
    expect(await heading(t('auth.institution.title'))).toBeInTheDocument();
  });

  it.each<[Role, string, string]>([
    ['OPERATOR', ROUTE_PATHS.root, ROUTE_PATHS.operator.home],
    ['BOARD_ADMIN', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['BOARD_MEMBER', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['INSTITUTION_ADMIN', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['VIEWER', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['PROJECT_TEAM', ROUTE_PATHS.root, ROUTE_PATHS.team.evaluation],
    ['SUPPORT_ENTITY', ROUTE_PATHS.root, ROUTE_PATHS.entity.summaries],
  ])('redirects %s from the root to its home', (role, from, expected) => {
    const router = renderAt(from, role);

    expect(router.state.location.pathname).toBe(expected);
  });

  it('renders the operator layout with its navigation', async () => {
    renderAt(ROUTE_PATHS.operator.home, 'OPERATOR');

    expect(screen.getByRole('navigation', { name: t('app.mainNavigation') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('nav.newReading') })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(
      await heading(new RegExp(`^${t('home.todayHeading', { date: '' })}`)),
    ).toBeInTheDocument();
  });

  it('shows the 403 page when a role opens another role area', async () => {
    renderAt(ROUTE_PATHS.board.proposals, 'OPERATOR');

    expect(await heading(t('errors.forbiddenTitle'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('errors.goHome') })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.home,
    );
  });

  it('lets only BOARD_ADMIN open user administration', async () => {
    renderAt(ROUTE_PATHS.board.users, 'BOARD_ADMIN');
    expect(await heading(t('screens.users'))).toBeInTheDocument();
  });

  it('blocks BOARD_MEMBER from user administration and hides the menu item', async () => {
    renderAt(ROUTE_PATHS.board.users, 'BOARD_MEMBER');

    expect(await heading(t('errors.forbiddenTitle'))).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t('nav.users') })).not.toBeInTheDocument();
  });

  it('shares /tanque between operator, board and team but not with the entity role', async () => {
    renderAt(ROUTE_PATHS.tank, 'PROJECT_TEAM');
    expect(await heading(t('screens.tankStatus'))).toBeInTheDocument();
  });

  it('forbids /tanque to SUPPORT_ENTITY', async () => {
    renderAt(ROUTE_PATHS.tank, 'SUPPORT_ENTITY');
    expect(await heading(t('errors.forbiddenTitle'))).toBeInTheDocument();
  });

  it('answers 404 for undeclared routes', async () => {
    renderAt('/ruta-que-no-existe', 'OPERATOR');
    expect(await heading(t('errors.notFoundTitle'))).toBeInTheDocument();
  });
});
