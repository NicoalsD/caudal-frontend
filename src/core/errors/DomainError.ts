/**
 * Error the application understands, built from the canonical API envelope
 * {"error":{"code","message","details","request_id"}} (architecture.md section 10).
 * `message` is the server text in Spanish: only a fallback, the UI shows es.ts texts by `code`.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly requestId: string | null;

  constructor(
    code: string,
    serverMessage: string,
    details: Readonly<Record<string, unknown>> = {},
    requestId: string | null = null,
  ) {
    super(serverMessage);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}
