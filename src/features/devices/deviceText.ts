import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
export { kindText, statusText } from '../../i18n/deviceText';
import { DomainError } from '../../core/errors/DomainError';

const INVALID_KEY = 'INVALID_KEY';
const CONFLICT = 'CONFLICT';

/**
 * The text for a failed key change. The key itself is never part of the text: the server codes
 * say what went wrong and the screen says it in plain words.
 */
export function keyErrorMessage(error: unknown): string {
  if (error instanceof DomainError && error.code === INVALID_KEY) {
    return t('devices.errors.invalidKey');
  }
  if (error instanceof DomainError && error.code === CONFLICT) {
    return t('devices.errors.keyExists');
  }
  return errorText(error).message;
}
