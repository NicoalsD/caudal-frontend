/** A reference document kept on the phone, with the moment it was fetched. */
export interface CachedReference {
  readonly payload: unknown;
  readonly fetchedAtMs: number;
}

/** Port: where reference data (constraints, rules, catalogs, tanks) is kept per scope. */
export interface ReferenceStore {
  load(scope: string, name: string): Promise<CachedReference | null>;
  save(scope: string, name: string, payload: unknown, fetchedAtMs: number): Promise<void>;
  /** Sign out: nothing from the previous person survives. */
  clear(): Promise<void>;
}
