import { DomainError } from '../../core/errors/DomainError';
import { minutesToWait, retryAfterSecondsOf } from '../../core/errors/httpInfo';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const RATE_LIMITED_CODE = 'RATE_LIMITED';
const NO_LEVEL_DATA_CODE = 'NO_LEVEL_DATA';

/**
 * The text for a failed recalculation. The hourly limit says how long to wait when the server
 * sends Retry-After; a tank without recent readings asks for one (API.md 8.3).
 */
export function forecastRunErrorMessage(error: unknown): string {
  if (error instanceof DomainError && error.code === RATE_LIMITED_CODE) {
    const seconds = retryAfterSecondsOf(error);
    return seconds === null
      ? t('forecast.runRateLimited')
      : t('forecast.runRateLimitedWait', { minutes: String(minutesToWait(seconds)) });
  }
  if (error instanceof DomainError && error.code === NO_LEVEL_DATA_CODE) {
    return t('forecast.runNoLevelData');
  }
  return errorText(error).message;
}
