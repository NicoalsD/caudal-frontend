import { DomainError } from '../../core/errors/DomainError';
import { errorText } from '../../i18n/errorText';

const GAUGE_OUT_OF_RANGE = 'GAUGE_OUT_OF_RANGE';

export interface ReadingFailure {
  /** Set when the message belongs under the gauge field. */
  readonly field: 'gauge_value' | null;
  readonly message: string;
  readonly supportCode: string | null;
}

/**
 * What to show when the server refuses a reading (422 and others). The out-of-range error goes
 * under the gauge field, with the range the server sent; the rest is a message for the form.
 * The texts come from es.ts by code, never from the server message.
 */
export function readingFailure(error: unknown): ReadingFailure {
  const text = errorText(error);
  if (error instanceof DomainError && error.code === GAUGE_OUT_OF_RANGE) {
    return { field: 'gauge_value', message: text.message, supportCode: null };
  }
  return { field: null, message: text.message, supportCode: text.supportCode };
}
