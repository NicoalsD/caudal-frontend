import { lazy, Suspense } from 'react';
import type { ComponentType, JSX } from 'react';
import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { AuditLayout } from './layouts/AuditLayout';
import { EvaluationLayout } from './layouts/EvaluationLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequirePasswordChanged } from './guards/RequirePasswordChanged';
import { RequirePrivacyAccepted } from './guards/RequirePrivacyAccepted';
import { RequireRole } from './guards/RequireRole';
import { AuthLayout } from './layouts/AuthLayout';
import { BoardLayout } from './layouts/BoardLayout';
import { EntityLayout } from './layouts/EntityLayout';
import { OperatorLayout } from './layouts/OperatorLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { SharedLayout } from './layouts/SharedLayout';
import { TeamLayout } from './layouts/TeamLayout';
import { strings } from '../i18n/es';
import { LoadingState } from '../ui/feedback/LoadingState';
import { ErrorPage } from './pages/ErrorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RootRedirect } from './pages/RootRedirect';
import { ROLES_BY_AREA, ROUTE_PATHS } from '../core/session/routes';

/**
 * Each screen is its own chunk: the first load only brings the shell and the screen being opened.
 * The guards and the layout stay in the main chunk, so a redirect never waits for a download, and
 * the service worker still precaches every chunk, so the operator's screens keep opening offline.
 */
function screen<Module, Key extends keyof Module>(
  load: () => Promise<Module>,
  name: Key & (Module[Key] extends ComponentType ? Key : never),
): JSX.Element {
  const Screen = lazy(async () => ({ default: (await load())[name] as ComponentType }));
  return (
    <Suspense fallback={<LoadingState message={strings.common.loadingScreen} />}>
      <Screen />
    </Suspense>
  );
}

const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    {
      path: ROUTE_PATHS.public.schedule,
      element: screen(() => import('../features/public'), 'PublicSchedulePage'),
    },
    {
      path: ROUTE_PATHS.public.damageReport,
      element: screen(() => import('../features/public'), 'DamageReportPage'),
    },
    {
      path: ROUTE_PATHS.public.tracking,
      element: screen(() => import('../features/public'), 'PublicTrackingPage'),
    },
  ],
};

const signInRoutes: RouteObject = {
  element: <AuthLayout />,
  children: [
    { path: ROUTE_PATHS.login, element: screen(() => import('../features/auth'), 'LoginPage') },
  ],
};

const sessionRoutes: RouteObject = {
  children: [
    {
      element: <AuthLayout />,
      children: [
        {
          path: ROUTE_PATHS.changePassword,
          element: screen(() => import('../features/auth'), 'ChangePasswordPage'),
        },
      ],
    },
    {
      element: <PublicLayout />,
      children: [
        {
          path: ROUTE_PATHS.privacyNotice,
          element: screen(() => import('../features/privacy'), 'PrivacyNoticePage'),
        },
      ],
    },
  ],
};

const operatorRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.operator} />,
  children: [
    {
      element: <OperatorLayout />,
      children: [
        {
          path: ROUTE_PATHS.operator.home,
          element: screen(() => import('../features/home/OperatorHomePage'), 'OperatorHomePage'),
        },
        {
          path: ROUTE_PATHS.operator.newReading,
          element: screen(() => import('../features/readings'), 'ReadingPage'),
        },
        {
          path: ROUTE_PATHS.operator.pending,
          element: screen(() => import('../features/readings'), 'PendingReadingsPage'),
        },
        {
          path: ROUTE_PATHS.operator.dayClosure,
          element: screen(() => import('../features/closure'), 'DayClosurePage'),
        },
        {
          path: ROUTE_PATHS.operator.damage,
          element: screen(() => import('../features/incidents'), 'OperatorDamagePage'),
        },
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
        {
          path: ROUTE_PATHS.board.tank,
          element: screen(
            () => import('../features/board/BoardDashboardPage'),
            'BoardDashboardPage',
          ),
        },
        {
          path: ROUTE_PATHS.board.proposals,
          element: screen(() => import('../features/proposals'), 'ProposalListPage'),
        },
        {
          path: ROUTE_PATHS.board.proposalDetail,
          element: screen(() => import('../features/proposals'), 'ProposalDetailPage'),
        },
        {
          path: ROUTE_PATHS.board.proposalEdit,
          element: screen(() => import('../features/proposals'), 'ProposalEditorPage'),
        },
        {
          path: ROUTE_PATHS.board.publication,
          element: screen(() => import('../features/proposals'), 'ProposalPublicationPage'),
        },
        {
          path: ROUTE_PATHS.board.rules,
          element: screen(() => import('../features/rules'), 'RulesPage'),
        },
        {
          path: ROUTE_PATHS.board.ruleDetail,
          element: screen(() => import('../features/rules'), 'RuleDraftPage'),
        },
        {
          path: ROUTE_PATHS.board.ruleHistory,
          element: screen(() => import('../features/rules'), 'RuleHistoryPage'),
        },
        {
          path: ROUTE_PATHS.board.network,
          element: screen(() => import('../features/admin'), 'NetworkPage'),
        },
        {
          path: ROUTE_PATHS.board.minutes,
          element: screen(() => import('../features/minutes'), 'MinutesPage'),
        },
        {
          path: ROUTE_PATHS.board.incidents,
          element: screen(() => import('../features/incidents'), 'IncidentsPage'),
        },
        {
          path: ROUTE_PATHS.board.autopilot,
          element: screen(() => import('../features/autopilot'), 'AutopilotPage'),
        },
        {
          path: ROUTE_PATHS.board.reports,
          element: screen(() => import('../features/reports'), 'ReportsPage'),
        },
        {
          element: <RequireRole roles={ROLES_BY_AREA.boardAdmin} />,
          children: [
            {
              path: ROUTE_PATHS.board.users,
              element: screen(() => import('../features/users'), 'UsersPage'),
            },
            {
              path: ROUTE_PATHS.board.entities,
              element: screen(() => import('../features/entities'), 'EntitiesPage'),
            },
            {
              path: ROUTE_PATHS.board.regions,
              element: screen(() => import('../features/regions'), 'RegionsPage'),
            },
          ],
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
        {
          path: ROUTE_PATHS.team.health,
          element: screen(() => import('../features/health'), 'HealthPage'),
        },
        {
          path: ROUTE_PATHS.team.imports,
          element: screen(() => import('../features/imports'), 'ImportPage'),
        },
      ],
    },
  ],
};

const evaluationRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.evaluation} />,
  children: [
    {
      element: <EvaluationLayout />,
      children: [
        {
          path: ROUTE_PATHS.team.evaluation,
          element: screen(() => import('../features/evaluation'), 'EvaluationPage'),
        },
      ],
    },
  ],
};

const auditRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.audit} />,
  children: [
    {
      element: <AuditLayout />,
      children: [
        {
          path: ROUTE_PATHS.team.audit,
          element: screen(() => import('../features/audit'), 'AuditPage'),
        },
      ],
    },
  ],
};

/** Devices are shared by the Board's administrator and the project team (DEVICE_MANAGE). */
const devicesRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.devices} />,
  children: [
    {
      element: <AuditLayout />,
      children: [
        {
          path: ROUTE_PATHS.team.devices,
          element: screen(() => import('../features/devices'), 'DevicesPage'),
        },
      ],
    },
  ],
};

const entityRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.entity} />,
  children: [
    {
      element: <EntityLayout />,
      children: [
        {
          path: ROUTE_PATHS.entity.summaries,
          element: screen(() => import('../features/entity-summaries'), 'EntitySummariesPage'),
        },
      ],
    },
  ],
};

const sharedRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.tank} />,
  children: [
    {
      element: <SharedLayout />,
      children: [
        {
          path: ROUTE_PATHS.tank,
          element: screen(() => import('../features/tank-status'), 'TankStatusPage'),
        },
      ],
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
              children: [
                {
                  element: <RequirePrivacyAccepted />,
                  children: [
                    operatorRoutes,
                    boardRoutes,
                    teamRoutes,
                    evaluationRoutes,
                    auditRoutes,
                    devicesRoutes,
                    entityRoutes,
                    sharedRoutes,
                  ],
                },
              ],
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
