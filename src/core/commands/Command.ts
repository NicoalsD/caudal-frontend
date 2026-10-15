import type { OutboxKind } from './OutboxRecord';

/**
 * A unit of work the phone wants to do later (Command pattern, P13). The `clientId` is the
 * idempotency key: sending the same command twice must not create two records on the server.
 */
export interface Command<Payload> {
  readonly clientId: string;
  readonly kind: OutboxKind;
  readonly payload: Payload;
}
