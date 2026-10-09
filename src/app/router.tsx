import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { t } from '../i18n/t';
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

/** Builds one leaf route that renders a placeholder until its feature exists. */
function screen(path: string, title: string): RouteObject {
  return { path, element: <PlaceholderPage title={title} /> };
}

const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    screen(ROUTE_PATHS.public.schedule, t('screens.publicSchedule')),
    screen(ROUTE_PATHS.public.damageReport, t('screens.publicDamageReport')),
    screen(ROUTE_PATHS.public.tracking, t('screens.publicTracking')),
    screen(ROUTE_PATHS.login, t('screens.login')),
  ],
};

const sessionRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    screen(ROUTE_PATHS.changePassword, t('screens.changePassword')),
    screen(ROUTE_PATHS.privacyNotice, t('screens.privacyNotice')),
  ],
};

const operatorRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.operator} />,
  children: [
    {
      element: <OperatorLayout />,
      children: [
        screen(ROUTE_PATHS.operator.home, t('screens.operatorHome')),
        screen(ROUTE_PATHS.operator.newReading, t('screens.newReading')),
        screen(ROUTE_PATHS.operator.pending, t('screens.pendingReadings')),
        screen(ROUTE_PATHS.operator.dayClosure, t('screens.dayClosure')),
        screen(ROUTE_PATHS.operator.damage, t('screens.operatorDamage')),
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
        screen(ROUTE_PATHS.board.tank, t('screens.tankStatus')),
        screen(ROUTE_PATHS.board.proposals, t('screens.proposals')),
        screen(ROUTE_PATHS.board.proposalDetail, t('screens.proposalDetail')),
        screen(ROUTE_PATHS.board.publication, t('screens.publication')),
        screen(ROUTE_PATHS.board.rules, t('screens.rules')),
        screen(ROUTE_PATHS.board.ruleDetail, t('screens.ruleDetail')),
        screen(ROUTE_PATHS.board.ruleHistory, t('screens.ruleHistory')),
        screen(ROUTE_PATHS.board.network, t('screens.network')),
        screen(ROUTE_PATHS.board.minutes, t('screens.minutes')),
        screen(ROUTE_PATHS.board.incidents, t('screens.incidents')),
        screen(ROUTE_PATHS.board.entities, t('screens.entities')),
        {
          element: <RequireRole roles={ROLES_BY_AREA.boardAdmin} />,
          children: [screen(ROUTE_PATHS.board.users, t('screens.users'))],
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
        screen(ROUTE_PATHS.team.evaluation, t('screens.evaluation')),
        screen(ROUTE_PATHS.team.health, t('screens.health')),
        screen(ROUTE_PATHS.team.devices, t('screens.devices')),
        screen(ROUTE_PATHS.team.audit, t('screens.audit')),
        screen(ROUTE_PATHS.team.imports, t('screens.imports')),
      ],
    },
  ],
};

const entityRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.entity} />,
  children: [
    {
      element: <EntityLayout />,
      children: [screen(ROUTE_PATHS.entity.summaries, t('screens.summaries'))],
    },
  ],
};

const sharedRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.tank} />,
  children: [
    {
      element: <SharedLayout />,
      children: [screen(ROUTE_PATHS.tank, t('screens.tankStatus'))],
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
