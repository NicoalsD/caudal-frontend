import { DomainError } from '../core/errors/DomainError';
import { ErrorCodeMapper, snakeToCamel } from '../core/errors/ErrorCodeMapper';
import { NetworkError } from '../core/errors/NetworkError';
import { interpolate } from '../core/format/message';
import { strings } from './es';
import { t } from './t';

const mapper = new ErrorCodeMapper(new Set(Object.keys(strings.errors.api)));

type ApiTexts = Readonly<Record<string, string>>;

/** Details come formatted from the server ("0,00"); only plain values are interpolated. */
function placeholderValues(details: Readonly<Record<string, unknown>>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(details)) {
    if (typeof value === 'string' || typeof value === 'number') {
      values[snakeToCamel(name)] = String(value);
    }
  }
  return values;
}

export interface ErrorText {
  readonly message: string;
  /** "Código de soporte: ..." for server errors, otherwise null. */
  readonly supportCode: string | null;
}

const SERVER_ERROR_CODE = 'INTERNAL_ERROR';

/**
 * The text to show for an error. Known API codes use es.ts; an unknown code falls back to the
 * server message, and anything else to the generic text. Never shows traces or raw details.
 */
export function errorText(error: unknown): ErrorText {
  if (!(error instanceof DomainError)) {
    return {
      message: error instanceof NetworkError ? t('errors.network') : t('errors.generic'),
      supportCode: null,
    };
  }
  const key = mapper.keyFor(error.code);
  const template = key === null ? undefined : (strings.errors.api as ApiTexts)[key];
  const message =
    template === undefined
      ? error.message === ''
        ? t('errors.generic')
        : error.message
      : interpolate(template, placeholderValues(error.details));
  const showSupportCode = error.code === SERVER_ERROR_CODE && error.requestId !== null;
  return {
    message,
    supportCode: showSupportCode
      ? t('errors.supportCode', { requestId: error.requestId ?? '' })
      : null,
  };
}
