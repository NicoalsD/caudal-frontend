import { ROUTE_PATHS } from '../../core/session/routes';

/** The detail screen of one proposal (S13). */
export function proposalDetailPath(id: string): string {
  return ROUTE_PATHS.board.proposalDetail.replace(':id', encodeURIComponent(id));
}

/** The editor of one proposal (S14). */
export function proposalEditPath(id: string): string {
  return ROUTE_PATHS.board.proposalEdit.replace(':id', encodeURIComponent(id));
}

/** The publication screen (S15) for one proposal; without it, the day's proposal is shown. */
export function publicationPath(proposalId: string): string {
  return `${ROUTE_PATHS.board.publication}?proposal=${encodeURIComponent(proposalId)}`;
}
