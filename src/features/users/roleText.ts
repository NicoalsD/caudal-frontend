import type { Role } from '../../core/session/roles';
import { t } from '../../i18n/t';

/** The name of a role as the Board reads it, for example "Fontanero" (es.ts, users.roles). */
export function roleText(role: Role): string {
  switch (role) {
    case 'BOARD_ADMIN':
      return t('users.roles.boardAdmin');
    case 'BOARD_MEMBER':
      return t('users.roles.boardMember');
    case 'OPERATOR':
      return t('users.roles.operator');
    case 'PROJECT_TEAM':
      return t('users.roles.projectTeam');
    case 'SUPPORT_ENTITY':
      return t('users.roles.supportEntity');
  }
}
