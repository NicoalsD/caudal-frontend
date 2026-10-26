import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';

import { ChangePasswordPage, LoginPage } from '../features/auth';
import { NetworkPage } from '../features/admin';
import { ImportPage } from '../features/imports';
import { HealthPage } from '../features/health';
import { OperatorHomePage } from '../features/home/OperatorHomePage';
import { DayClosurePage } from '../features/closure';
import { MinutesPage } from '../features/minutes';
import { PendingReadingsPage, ReadingPage } from '../features/readings';
import { TankStatusPage } from '../features/tank-status';
import { IncidentsPage, OperatorDamagePage } from '../features/incidents';
import { DamageReportPage, PublicSchedulePage, PublicTrackingPage } from '../features/public';
import { BoardDayGuide } from '../features/board/BoardDayGuide';
import {
  ProposalDetailPage,
  ProposalEditorPage,
  ProposalListPage,
  ProposalPublicationPage,
} from '../features/proposals';
import { RuleDraftPage, RuleHistoryPage, RulesPage } from '../features/rules';
import { UsersPage } from '../features/users';
import { PrivacyNoticePage } from '../features/privacy';
import { EntitiesPage } from '../features/entities';
import { EntitySummariesPage } from '../features/entity-summaries';
import { EvaluationPage } from '../features/evaluation';
import { AuditPage } from '../features/audit';
import { DevicesPage } from '../features/devices';
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
import { ErrorPage } from './pages/ErrorPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RootRedirect } from './pages/RootRedirect';
import { ROLES_BY_AREA, ROUTE_PATHS } from '../core/session/routes';

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
      children: [{ path: ROUTE_PATHS.privacyNotice, element: <PrivacyNoticePage /> }],
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
        { path: ROUTE_PATHS.operator.dayClosure, element: <DayClosurePage /> },
        { path: ROUTE_PATHS.operator.damage, element: <OperatorDamagePage /> },
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
          element: (
            <>
              <BoardDayGuide />
              <TankStatusPage />
            </>
          ),
        },
        { path: ROUTE_PATHS.board.proposals, element: <ProposalListPage /> },
        { path: ROUTE_PATHS.board.proposalDetail, element: <ProposalDetailPage /> },
        { path: ROUTE_PATHS.board.proposalEdit, element: <ProposalEditorPage /> },
        { path: ROUTE_PATHS.board.publication, element: <ProposalPublicationPage /> },
        { path: ROUTE_PATHS.board.rules, element: <RulesPage /> },
        { path: ROUTE_PATHS.board.ruleDetail, element: <RuleDraftPage /> },
        { path: ROUTE_PATHS.board.ruleHistory, element: <RuleHistoryPage /> },
        { path: ROUTE_PATHS.board.network, element: <NetworkPage /> },
        { path: ROUTE_PATHS.board.minutes, element: <MinutesPage /> },
        { path: ROUTE_PATHS.board.incidents, element: <IncidentsPage /> },
        {
          element: <RequireRole roles={ROLES_BY_AREA.boardAdmin} />,
          children: [
            { path: ROUTE_PATHS.board.users, element: <UsersPage /> },
            { path: ROUTE_PATHS.board.entities, element: <EntitiesPage /> },
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
        { path: ROUTE_PATHS.team.health, element: <HealthPage /> },
        { path: ROUTE_PATHS.team.imports, element: <ImportPage /> },
      ],
    },
  ],
};

const evaluationRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.evaluation} />,
  children: [
    {
      element: <EvaluationLayout />,
      children: [{ path: ROUTE_PATHS.team.evaluation, element: <EvaluationPage /> }],
    },
  ],
};

const auditRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.audit} />,
  children: [
    {
      element: <AuditLayout />,
      children: [{ path: ROUTE_PATHS.team.audit, element: <AuditPage /> }],
    },
  ],
};

/** Devices are shared by the Board's administrator and the project team (DEVICE_MANAGE). */
const devicesRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.devices} />,
  children: [
    {
      element: <AuditLayout />,
      children: [{ path: ROUTE_PATHS.team.devices, element: <DevicesPage /> }],
    },
  ],
};

const entityRoutes: RouteObject = {
  element: <RequireRole roles={ROLES_BY_AREA.entity} />,
  children: [
    {
      element: <EntityLayout />,
      children: [{ path: ROUTE_PATHS.entity.summaries, element: <EntitySummariesPage /> }],
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
