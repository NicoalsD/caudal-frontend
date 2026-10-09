import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import type { Role } from '../core/session/roles';
import { strings } from '../i18n/es';
import { SessionStore } from '../state/SessionStore';
import { SessionProvider } from './providers/SessionProvider';
import { buildRoutes } from './router';
import { ROUTE_PATHS } from './routes';

const USER_ID = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81';
const AQUEDUCT_ID = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a82';

function renderAt(path: string, role?: Role) {
  const store = new SessionStore();
  if (role !== undefined) {
    store.signIn({
      userId: USER_ID,
      role,
      aqueductId: AQUEDUCT_ID,
      displayName: 'Persona de prueba',
    });
  }
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  render(
    <SessionProvider store={store}>
      <RouterProvider router={router} />
    </SessionProvider>,
  );
  return router;
}

const heading = (name: string) => screen.getByRole('heading', { level: 1, name });

describe('role router', () => {
  it('shows the public schedule without a session', () => {
    renderAt('/p/vereda-de-prueba');

    expect(heading(strings.screens.publicSchedule)).toBeInTheDocument();
  });

  it('sends anonymous visitors of a private route to login keeping the next path', () => {
    const router = renderAt(ROUTE_PATHS.operator.pending);

    expect(router.state.location.pathname).toBe(ROUTE_PATHS.login);
    expect(router.state.location.search).toBe(
      `?next=${encodeURIComponent(ROUTE_PATHS.operator.pending)}`,
    );
    expect(heading(strings.screens.login)).toBeInTheDocument();
  });

  it.each<[Role, string, string]>([
    ['OPERATOR', ROUTE_PATHS.root, ROUTE_PATHS.operator.home],
    ['BOARD_ADMIN', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['BOARD_MEMBER', ROUTE_PATHS.root, ROUTE_PATHS.board.tank],
    ['PROJECT_TEAM', ROUTE_PATHS.root, ROUTE_PATHS.team.evaluation],
    ['SUPPORT_ENTITY', ROUTE_PATHS.root, ROUTE_PATHS.entity.summaries],
  ])('redirects %s from the root to its home', (role, from, expected) => {
    const router = renderAt(from, role);

    expect(router.state.location.pathname).toBe(expected);
  });

  it('renders the operator layout with its navigation', () => {
    renderAt(ROUTE_PATHS.operator.home, 'OPERATOR');

    expect(
      screen.getByRole('navigation', { name: strings.app.mainNavigation }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: strings.nav.newReading })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(heading(strings.screens.operatorHome)).toBeInTheDocument();
  });

  it('shows the 403 page when a role opens another role area', () => {
    renderAt(ROUTE_PATHS.board.proposals, 'OPERATOR');

    expect(heading(strings.errors.forbiddenTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: strings.errors.goHome })).toHaveAttribute(
      'href',
      ROUTE_PATHS.operator.home,
    );
  });

  it('lets only BOARD_ADMIN open user administration', () => {
    renderAt(ROUTE_PATHS.board.users, 'BOARD_ADMIN');
    expect(heading(strings.screens.users)).toBeInTheDocument();
  });

  it('blocks BOARD_MEMBER from user administration and hides the menu item', () => {
    renderAt(ROUTE_PATHS.board.users, 'BOARD_MEMBER');

    expect(heading(strings.errors.forbiddenTitle)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: strings.nav.users })).not.toBeInTheDocument();
  });

  it('shares /tanque between operator, board and team but not with the entity role', () => {
    renderAt(ROUTE_PATHS.tank, 'PROJECT_TEAM');
    expect(heading(strings.screens.tankStatus)).toBeInTheDocument();
  });

  it('forbids /tanque to SUPPORT_ENTITY', () => {
    renderAt(ROUTE_PATHS.tank, 'SUPPORT_ENTITY');
    expect(heading(strings.errors.forbiddenTitle)).toBeInTheDocument();
  });

  it('answers 404 for undeclared routes', () => {
    renderAt('/ruta-que-no-existe', 'OPERATOR');
    expect(heading(strings.errors.notFoundTitle)).toBeInTheDocument();
  });
});
