import { NetworkError } from '../errors/NetworkError';
import type { Clock } from '../time/Clock';
import type { ReferenceStore } from './ReferenceStore';

/** Scope of the references that are the same for every aqueduct (constraints and catalogs). */
export const GLOBAL_REFERENCE_SCOPE = 'global';

/**
 * Reads a reference from the API and keeps a copy; when there is no connection it answers with the
 * copy instead (offline-sync.md section 10). Only a missing answer falls back: a refusal from the
 * server is an error, and a copy would hide it.
 */
export class ReferenceFallback {
  constructor(
    private readonly store: ReferenceStore,
    private readonly clock: Clock,
  ) {}

  async fetch<T>(scope: string, name: string, remote: () => Promise<T>): Promise<T> {
    try {
      const value = await remote();
      await this.remember(scope, name, value);
      return value;
    } catch (error) {
      if (!(error instanceof NetworkError)) {
        throw error;
      }
      const cached = await this.store.load(scope, name);
      if (cached === null) {
        throw error;
      }
      return cached.payload as T;
    }
  }

  private async remember(scope: string, name: string, value: unknown): Promise<void> {
    try {
      await this.store.save(scope, name, value, this.clock.nowMs());
    } catch {
      // A full or blocked disk must not fail a read that the server answered.
    }
  }
}
