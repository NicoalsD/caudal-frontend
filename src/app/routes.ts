import type { Role } from '../core/session/roles';

/** Public path prefix (architecture.md section 4). Change here only. */
const PUBLIC_PREFIX = '/p';

/** Route paths by actor. Every route not listed here answers 404 (deny by default). */
export const ROUTE_PATHS = {
  root: '/',
  login: '/login',
  changePassword: '/cambiar-contrasena',
  privacyNotice: '/aviso-de-privacidad',
  tank: '/tanque',
  public: {
    schedule: `${PUBLIC_PREFIX}/:aqueductSlug`,
    damageReport: `${PUBLIC_PREFIX}/:aqueductSlug/reportar-dano`,
    tracking: `${PUBLIC_PREFIX}/seguimiento/:trackingCode`,
  },
  operator: {
    base: '/operador',
    home: '/operador/inicio',
    newReading: '/operador/lectura/nueva',
    pending: '/operador/pendientes',
    dayClosure: '/operador/cierre/:date',
    damage: '/operador/dano',
  },
  board: {
    base: '/junta',
    tank: '/junta/tanque',
    proposals: '/junta/propuestas',
    proposalDetail: '/junta/propuestas/:id',
    publication: '/junta/publicacion',
    rules: '/junta/reglas',
    ruleDetail: '/junta/reglas/:id',
    ruleHistory: '/junta/reglas/:id/historial',
    network: '/junta/red',
    minutes: '/junta/actas',
    incidents: '/junta/incidentes',
    entities: '/junta/entidades',
    users: '/junta/usuarios',
  },
  team: {
    base: '/equipo',
    evaluation: '/equipo/evaluacion',
    health: '/equipo/salud',
    devices: '/equipo/dispositivos',
    audit: '/equipo/auditoria',
    imports: '/equipo/importacion',
  },
  entity: {
    base: '/entidad',
    summaries: '/entidad/resumenes',
  },
} as const;

/** First screen of each role after signing in. */
export const HOME_PATH_BY_ROLE: Readonly<Record<Role, string>> = {
  OPERATOR: ROUTE_PATHS.operator.home,
  BOARD_ADMIN: ROUTE_PATHS.board.tank,
  BOARD_MEMBER: ROUTE_PATHS.board.tank,
  PROJECT_TEAM: ROUTE_PATHS.team.evaluation,
  SUPPORT_ENTITY: ROUTE_PATHS.entity.summaries,
};

/** Roles that may open each route family. Guards use these lists for UX only. */
export const ROLES_BY_AREA = {
  operator: ['OPERATOR'],
  board: ['BOARD_ADMIN', 'BOARD_MEMBER'],
  boardAdmin: ['BOARD_ADMIN'],
  team: ['PROJECT_TEAM'],
  entity: ['SUPPORT_ENTITY'],
  tank: ['OPERATOR', 'BOARD_ADMIN', 'BOARD_MEMBER', 'PROJECT_TEAM'],
} as const satisfies Record<string, readonly Role[]>;
