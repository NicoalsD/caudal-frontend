import { DomainError } from '../../core/errors/DomainError';
import { NetworkError } from '../../core/errors/NetworkError';
import { httpStatusOf, minutesToWait, retryAfterSecondsOf } from '../../core/errors/httpInfo';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const UNAUTHORIZED_STATUS = 401;
const RATE_LIMITED_CODE = 'RATE_LIMITED';

/**
 * Text for a failed sign in. Any 401 shows the same sentence, so the screen never reveals whether
 * the user exists or the account is locked (security.md section 8).
 */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return t('auth.offlineLogin');
  }
  if (httpStatusOf(error) === UNAUTHORIZED_STATUS) {
    return t('errors.api.invalidCredentials');
  }
  if (error instanceof DomainError && error.code === RATE_LIMITED_CODE) {
    const seconds = retryAfterSecondsOf(error);
    if (seconds !== null) {
      return t('auth.tooManyAttempts', { minutes: String(minutesToWait(seconds)) });
    }
  }
  return errorText(error).message;
}
