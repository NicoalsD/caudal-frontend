import { t } from '../../i18n/t';

/** Codes of `unserved_sectors` (Reglas-de-negocio section 6.3), in plain words. */
const KNOWN_REASONS: Readonly<Record<string, 'noBudget' | 'smallShare' | 'notIncluded'>> = {
  NO_BUDGET: 'noBudget',
  CUOTA_INSUFICIENTE: 'smallShare',
  NO_INCLUIDO: 'notIncluded',
};

/** Why a sector got no shift today. An unknown code gets a generic sentence, never the raw code. */
export function unservedReasonText(code: string): string {
  const key = KNOWN_REASONS[code];
  return key === undefined ? t('proposals.unserved.unknown') : t(`proposals.unserved.${key}`);
}
