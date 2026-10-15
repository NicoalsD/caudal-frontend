import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { ChangePasswordPage, LoginPage } from '../features/auth';
import { NetworkPage } from '../features/admin';
import { ImportPage } from '../features/imports';
import { OperatorHomePage } from '../features/home/OperatorHomePage';
import { PendingReadingsPage, ReadingPage } from '../features/readings';
import { TankStatusPage } from '../features/tank-status';
import { IncidentsPage } from '../features/incidents';
import { DamageReportPage, PublicSchedulePage, PublicTrackingPage } from '../features/public';
import { RuleDraftPage, RulesPage } from '../features/rules';
import { t } from '../i18n/t';
import { RequireAuth } from './guards/RequireAuth';
import { RequirePasswordChanged } from './guards/RequirePasswordChanged';
import { RequireRole } from './guards/RequireRole';
import { AuthLayout } from './layouts/AuthLayout';
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
import { ROLES_BY_AREA, ROUTE_PATHS } from '../core/session/routes';

/** Builds one leaf route that renders a placeholder until its feature exists. */
function screen(path: string, title: string): RouteObject {
  return { path, element: <PlaceholderPage title={title} /> };
}

const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    { path: ROUTE_PATHS.public.schedule, element: <PublicSchedulePage /> },
    { path: ROUTE_PATHS.public.damageReport, element: <DamageReportPage /> },
    { path: ROUTE_PATHS.public.tracking, element: <PublicTrackingPage /> },
  ],
};

const signInRoutes: RouteObject = {
  element: <AuthLayout />,
  children: [{ path: ROUTE_PATHS.login, element: <LoginPage /> }],
};

const sessionRoutes: RouteObject = {
  children: [
    {
      element: <AuthLayout />,
      children: [{ path: ROUTE_PATHS.changePassword, element: <ChangePasswordPage /> }],
    },
    {
      element: <PublicLayout />,
      children: [screen(ROUTE_PATHS.privacyNotice, t('screens.privacyNotice'))],
    },
  ],
};

const operatorRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.operator} />,
  children: [
    {
      element: <OperatorLayout />,
      children: [
        { path: ROUTE_PATHS.operator.home, element: <OperatorHomePage /> },
        { path: ROUTE_PATHS.operator.newReading, element: <ReadingPage /> },
        { path: ROUTE_PATHS.operator.pending, element: <PendingReadingsPage /> },
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
        { path: ROUTE_PATHS.board.tank, element: <TankStatusPage /> },
        screen(ROUTE_PATHS.board.proposals, t('screens.proposals')),
        screen(ROUTE_PATHS.board.proposalDetail, t('screens.proposalDetail')),
        screen(ROUTE_PATHS.board.publication, t('screens.publication')),
        { path: ROUTE_PATHS.board.rules, element: <RulesPage /> },
        { path: ROUTE_PATHS.board.ruleDetail, element: <RuleDraftPage /> },
        screen(ROUTE_PATHS.board.ruleHistory, t('screens.ruleHistory')),
        { path: ROUTE_PATHS.board.network, element: <NetworkPage /> },
        screen(ROUTE_PATHS.board.minutes, t('screens.minutes')),
        { path: ROUTE_PATHS.board.incidents, element: <IncidentsPage /> },
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
        { path: ROUTE_PATHS.team.imports, element: <ImportPage /> },
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
      children: [{ path: ROUTE_PATHS.tank, element: <TankStatusPage /> }],
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
        signInRoutes,
        {
          element: <RequireAuth />,
          children: [
            sessionRoutes,
            {
              element: <RequirePasswordChanged />,
              children: [operatorRoutes, boardRoutes, teamRoutes, entityRoutes, sharedRoutes],
            },
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
