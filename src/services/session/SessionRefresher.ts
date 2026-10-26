/**
 * Renews the access token using the refresh cookie. Implementations must be single-flight:
 * the server rotates the cookie on every use and revokes the family if an old one comes back,
 * so two parallel refreshes would end the session.
 */
export interface SessionRefresher {
  /** Resolves when a new access token is in memory; rejects when the session cannot continue. */
  refresh(): Promise<void>;
}
