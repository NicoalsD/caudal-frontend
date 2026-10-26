import { NetworkError } from '../../core/errors/NetworkError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

/**
 * The text for a failed report. A connection failure says the report was not kept: signed-in
 * reports are not queued offline (offline-sync.md), so the person sends it again with signal.
 */
export function operatorDamageErrorMessage(error: unknown): string {
  return error instanceof NetworkError ? t('operatorDamage.offline') : errorText(error).message;
}
