import { DomainError } from '../../core/errors/DomainError';
import { NetworkError } from '../../core/errors/NetworkError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const RATE_LIMITED_CODE = 'RATE_LIMITED';

/**
 * The text for a failed damage report. The limit per IP has its own sentence (API.md 1.8); a
 * connection failure says the report is not queued (public reports need the code at once).
 */
export function damageReportErrorMessage(error: unknown): string {
  if (error instanceof DomainError && error.code === RATE_LIMITED_CODE) {
    return t('publicReport.rateLimited');
  }
  if (error instanceof NetworkError) {
    return t('publicReport.offline');
  }
  return errorText(error).message;
}
