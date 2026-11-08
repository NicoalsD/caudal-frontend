import { describe, expect, it } from 'vitest';

import { canRoleOpenPath, ROUTE_PATHS } from './routes';

describe('canRoleOpenPath', () => {
  it.each([
    ['OPERATOR', ROUTE_PATHS.operator.home, true],
    ['OPERATOR', `${ROUTE_PATHS.operator.pending}?page=2#top`, true],
    ['OPERATOR', ROUTE_PATHS.tank, true],
    ['OPERATOR', ROUTE_PATHS.board.tank, false],
    ['BOARD_ADMIN', ROUTE_PATHS.operator.home, false],
    ['BOARD_ADMIN', ROUTE_PATHS.board.users, true],
    ['BOARD_MEMBER', ROUTE_PATHS.board.users, false],
    ['BOARD_MEMBER', ROUTE_PATHS.board.proposals, true],
    ['BOARD_ADMIN', ROUTE_PATHS.team.audit, true],
    ['BOARD_ADMIN', ROUTE_PATHS.team.health, false],
    ['PROJECT_TEAM', ROUTE_PATHS.team.health, true],
    ['SUPPORT_ENTITY', ROUTE_PATHS.entity.summaries, true],
    ['SUPPORT_ENTITY', ROUTE_PATHS.tank, false],
  ] as const)('%s opening %s: %s', (role, path, expected) => {
    expect(canRoleOpenPath(role, path)).toBe(expected);
  });

  it('does not mistake a longer word for an area', () => {
    expect(canRoleOpenPath('OPERATOR', '/juntas')).toBe(true);
  });

  it('leaves public and unknown paths to the router', () => {
    expect(canRoleOpenPath('OPERATOR', '/a/vereda')).toBe(true);
  });
});
