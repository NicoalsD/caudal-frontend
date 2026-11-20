import { DomainError } from '../../core/errors/DomainError';

/** Code used when the server answers something that is not the canonical envelope. */
export const UNEXPECTED_RESPONSE_CODE = 'UNEXPECTED_RESPONSE';

/** The API answered with an error. Typed from the canonical envelope (API.md section 1.3). */
export class ApiError extends DomainError {
  readonly status: number;
  /** Seconds from the Retry-After header (429), or null. */
  readonly retryAfterSeconds: number | null;

  constructor(
    status: number,
    code: string,
    serverMessage: string,
    details: Readonly<Record<string, unknown>> = {},
    requestId: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(code, serverMessage, details, requestId);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isAbortError(error: unknown): boolean {
  // Duck typing: DOMException may come from another realm (jsdom, iframes).
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}
