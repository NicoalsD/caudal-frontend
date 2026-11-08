import {
  AlertTriangle,
  BarChart3,
  BookOpenText,
  Building2,
  CalendarCheck,
  ClipboardList,
  CloudUpload,
  Cpu,
  Droplets,
  FileText,
  GitFork,
  HeartPulse,
  House,
  LayoutDashboard,
  Megaphone,
  PencilLine,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

import { t } from '../../i18n/t';
import type { NavItem } from './RoleLayout';
import { ROUTE_PATHS } from '../../core/session/routes';

/** The operator works one-handed on a phone: these five become a bottom tab bar on small screens. */
export const OPERATOR_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.operator.home, label: t('nav.operatorHome'), icon: House },
  { to: ROUTE_PATHS.operator.newReading, label: t('nav.newReading'), icon: PencilLine },
  { to: ROUTE_PATHS.operator.pending, label: t('nav.pending'), icon: ClipboardList },
  { to: ROUTE_PATHS.operator.damage, label: t('nav.damage'), icon: AlertTriangle },
  { to: ROUTE_PATHS.tank, label: t('nav.tank'), icon: Droplets },
];

const BOARD_DAY_GROUP = t('nav.groups.day');
const BOARD_SETUP_GROUP = t('nav.groups.setup');
const BOARD_ADMIN_GROUP = t('nav.groups.admin');

export const BOARD_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.board.tank, label: t('nav.boardHome'), icon: LayoutDashboard },
  {
    to: ROUTE_PATHS.board.proposals,
    label: t('nav.proposals'),
    icon: CalendarCheck,
    group: BOARD_DAY_GROUP,
  },
  {
    to: ROUTE_PATHS.board.publication,
    label: t('nav.publication'),
    icon: Megaphone,
    group: BOARD_DAY_GROUP,
  },
  {
    to: ROUTE_PATHS.board.incidents,
    label: t('nav.incidents'),
    icon: AlertTriangle,
    group: BOARD_DAY_GROUP,
  },
  {
    to: ROUTE_PATHS.board.minutes,
    label: t('nav.minutes'),
    icon: BookOpenText,
    group: BOARD_DAY_GROUP,
  },
  {
    to: ROUTE_PATHS.board.rules,
    label: t('nav.rules'),
    icon: SlidersHorizontal,
    group: BOARD_SETUP_GROUP,
  },
  {
    to: ROUTE_PATHS.board.network,
    label: t('nav.network'),
    icon: GitFork,
    group: BOARD_SETUP_GROUP,
  },
];

/** Extra items only for BOARD_ADMIN: accounts, entities, devices, the audit log and the AI evaluation. */
export const BOARD_ADMIN_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.board.users, label: t('nav.users'), icon: Users, group: BOARD_ADMIN_GROUP },
  {
    to: ROUTE_PATHS.board.entities,
    label: t('nav.entities'),
    icon: Building2,
    group: BOARD_ADMIN_GROUP,
  },
  { to: ROUTE_PATHS.team.devices, label: t('nav.devices'), icon: Cpu, group: BOARD_ADMIN_GROUP },
  {
    to: ROUTE_PATHS.team.audit,
    label: t('nav.audit'),
    icon: ShieldCheck,
    group: BOARD_ADMIN_GROUP,
  },
  {
    to: ROUTE_PATHS.team.evaluation,
    label: t('nav.evaluation'),
    icon: BarChart3,
    group: BOARD_ADMIN_GROUP,
  },
];

export const TEAM_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.team.evaluation, label: t('nav.evaluation'), icon: BarChart3 },
  { to: ROUTE_PATHS.team.health, label: t('nav.health'), icon: HeartPulse },
  { to: ROUTE_PATHS.team.devices, label: t('nav.devices'), icon: Cpu },
  { to: ROUTE_PATHS.team.audit, label: t('nav.audit'), icon: ScrollText },
  { to: ROUTE_PATHS.team.imports, label: t('nav.imports'), icon: CloudUpload },
  { to: ROUTE_PATHS.tank, label: t('nav.tank'), icon: Droplets },
];

export const ENTITY_NAV: readonly NavItem[] = [
  { to: ROUTE_PATHS.entity.summaries, label: t('nav.summaries'), icon: FileText },
];
