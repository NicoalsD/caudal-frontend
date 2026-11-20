import { ROUTE_PATHS, institutionLoginPath } from '../../core/session/routes';

const NEXT_PARAM = 'next';

/** Adds the internal `next` target (kept by RequireAuth) to a login path, so the second step keeps it. */
function withNext(path: string, next: string | null): string {
  if (next === null || next === '') {
    return path;
  }
  return `${path}?${NEXT_PARAM}=${encodeURIComponent(next)}`;
}

/** Credentials step for the institution, keeping the pending `next` target. */
export function credentialsPathFor(slug: string, next: string | null): string {
  return withNext(institutionLoginPath(slug), next);
}

/** First step again ("Cambiar institución"), keeping the pending `next` target. */
export function chooseInstitutionPath(next: string | null): string {
  return withNext(ROUTE_PATHS.login, next);
}

/** The unknown-slug notice travels in the router state of the redirect back to the first step. */
export interface UnknownInstitutionState {
  readonly unknownInstitutionSlug: string;
}

export function isUnknownInstitutionState(state: unknown): state is UnknownInstitutionState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'unknownInstitutionSlug' in state &&
    typeof state.unknownInstitutionSlug === 'string'
  );
}
