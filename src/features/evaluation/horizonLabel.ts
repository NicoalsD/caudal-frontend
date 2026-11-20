import { t } from '../../i18n/t';

const ONE_DAY = 1;

/** "1 día" or "2 días": the label of a forecast horizon. */
export function horizonLabel(days: number): string {
  return days === ONE_DAY ? t('evaluation.horizonOne') : t('evaluation.horizonMany', { days });
}
