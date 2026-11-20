import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';

const ONE_HOUR = 1;

/** "1 hora", "8 horas", "2,5 horas": plain words for a length of time, decimal comma. */
export function hoursText(hours: number): string {
  if (hours === ONE_HOUR) {
    return t('proposals.hourOne');
  }
  const amount = formatDecimal(hours, Number.isInteger(hours) ? 0 : 1);
  return t('proposals.hourMany', { hours: amount });
}
