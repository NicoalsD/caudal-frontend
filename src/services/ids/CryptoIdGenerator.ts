import type { IdGenerator } from '../../core/ids/IdGenerator';

/** Client UUIDs (RFC 4122 v4) from the platform's secure random source. */
export class CryptoIdGenerator implements IdGenerator {
  nextId(): string {
    return crypto.randomUUID();
  }
}
