import { ROUTE_PATHS } from '../../core/session/routes';

/** The detail screen of one proposal (S13). */
export function proposalDetailPath(id: string): string {
  return ROUTE_PATHS.board.proposalDetail.replace(':id', encodeURIComponent(id));
}
