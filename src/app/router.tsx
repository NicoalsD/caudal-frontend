import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { strings } from '../i18n/es';
import { RequireAuth } from './guards/RequireAuth';
import { RequireRole } from './guards/RequireRole';
import { BoardLayout } from './layouts/BoardLayout';
import { EntityLayout } from './layouts/EntityLayout';
import { OperatorLayout } from './layouts/OperatorLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { SharedLayout } from './layouts/SharedLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { ErrorPage } from './pages/ErrorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RootRedirect } from './pages/RootRedirect';
import { ROLES_BY_AREA, ROUTE_PATHS } from './routes';

const screens = strings.screens;

/** Builds one leaf route that renders a placeholder until its feature exists. */
function screen(path: string, title: string): RouteObject {
  return { path, element: <PlaceholderPage title={title} /> };
}

const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    screen(ROUTE_PATHS.public.schedule, screens.publicSchedule),
    screen(ROUTE_PATHS.public.damageReport, screens.publicDamageReport),
    screen(ROUTE_PATHS.public.tracking, screens.publicTracking),
    screen(ROUTE_PATHS.login, screens.login),
  ],
};

const sessionRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    screen(ROUTE_PATHS.changePassword, screens.changePassword),
    screen(ROUTE_PATHS.privacyNotice, screens.privacyNotice),
  ],
};

const operatorRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.operator} />,
  children: [
    {
      element: <OperatorLayout />,
      children: [
        screen(ROUTE_PATHS.operator.home, screens.operatorHome),
        screen(ROUTE_PATHS.operator.newReading, screens.newReading),
        screen(ROUTE_PATHS.operator.pending, screens.pendingReadings),
        screen(ROUTE_PATHS.operator.dayClosure, screens.dayClosure),
        screen(ROUTE_PATHS.operator.damage, screens.operatorDamage),
      ],
    },
  ],
};

const boardRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.board} />,
  children: [
    {
      element: <BoardLayout />,
      children: [
        screen(ROUTE_PATHS.board.tank, screens.tankStatus),
        screen(ROUTE_PATHS.board.proposals, screens.proposals),
        screen(ROUTE_PATHS.board.proposalDetail, screens.proposalDetail),
        screen(ROUTE_PATHS.board.publication, screens.publication),
        screen(ROUTE_PATHS.board.rules, screens.rules),
        screen(ROUTE_PATHS.board.ruleDetail, screens.ruleDetail),
        screen(ROUTE_PATHS.board.ruleHistory, screens.ruleHistory),
        screen(ROUTE_PATHS.board.network, screens.network),
        screen(ROUTE_PATHS.board.minutes, screens.minutes),
        screen(ROUTE_PATHS.board.incidents, screens.incidents),
        screen(ROUTE_PATHS.board.entities, screens.entities),
        {
          element: <RequireRole roles={ROLES_BY_AREA.boardAdmin} />,
          children: [screen(ROUTE_PATHS.board.users, screens.users)],
        },
      ],
    },
  ],
};

const teamRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.team} />,
  children: [
    {
      element: <TeamLayout />,
      children: [
        screen(ROUTE_PATHS.team.evaluation, screens.evaluation),
        screen(ROUTE_PATHS.team.health, screens.health),
        screen(ROUTE_PATHS.team.devices, screens.devices),
        screen(ROUTE_PATHS.team.audit, screens.audit),
        screen(ROUTE_PATHS.team.imports, screens.imports),
      ],
    },
  ],
};

const entityRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.entity} />,
  children: [
    {
      element: <EntityLayout />,
      children: [screen(ROUTE_PATHS.entity.summaries, screens.summaries)],
    },
  ],
};

const sharedRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.tank} />,
  children: [
    {
      element: <SharedLayout />,
      children: [screen(ROUTE_PATHS.tank, screens.tankStatus)],
    },
  ],
};

/** Route table. Anything not declared here answers 404 (deny by default). */
export function buildRoutes(): RouteObject[] {
  return [
    {
      errorElement: <ErrorPage />,
      children: [
        { path: ROUTE_PATHS.root, element: <RootRedirect /> },
        publicRoutes,
        {
          element: <RequireAuth />,
          children: [
            sessionRoutes,
            operatorRoutes,
            boardRoutes,
            teamRoutes,
            entityRoutes,
            sharedRoutes,
          ],
        },
        {
          element: <PublicLayout />,
          children: [{ path: '*', element: <NotFoundPage /> }],
        },
      ],
    },
  ];
}

export function createAppRouter(): ReturnType<typeof createBrowserRouter> {
  return createBrowserRouter(buildRoutes());
}
