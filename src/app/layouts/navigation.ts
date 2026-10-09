import { strings } from '../../i18n/es';
import type { NavItem } from './RoleLayout';
import { ROUTE_PATHS } from '../routes';

const nav = strings.nav;

export const OPERATOR_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.operator.home, label: nav.operatorHome },
  { to: ROUTE_PATHS.operator.newReading, label: nav.newReading },
  { to: ROUTE_PATHS.operator.pending, label: nav.pending },
  { to: ROUTE_PATHS.operator.damage, label: nav.damage },
  { to: ROUTE_PATHS.tank, label: nav.tank },
];

export const BOARD_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.board.tank, label: nav.tank },
  { to: ROUTE_PATHS.board.proposals, label: nav.proposals },
  { to: ROUTE_PATHS.board.publication, label: nav.publication },
  { to: ROUTE_PATHS.board.rules, label: nav.rules },
  { to: ROUTE_PATHS.board.network, label: nav.network },
  { to: ROUTE_PATHS.board.minutes, label: nav.minutes },
  { to: ROUTE_PATHS.board.incidents, label: nav.incidents },
  { to: ROUTE_PATHS.board.entities, label: nav.entities },
];

/** Extra item only for BOARD_ADMIN (user administration). */
export const BOARD_ADMIN_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.board.users, label: nav.users },
];

export const TEAM_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.team.evaluation, label: nav.evaluation },
  { to: ROUTE_PATHS.team.health, label: nav.health },
  { to: ROUTE_PATHS.team.devices, label: nav.devices },
  { to: ROUTE_PATHS.team.audit, label: nav.audit },
  { to: ROUTE_PATHS.team.imports, label: nav.imports },
  { to: ROUTE_PATHS.tank, label: nav.tank },
];

export const ENTITY_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.entity.summaries, label: nav.summaries },
];
