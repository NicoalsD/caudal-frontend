import { isBandCode } from '../core/rules/ruleSetParts';
import { t } from './t';

/** "Alta", "Baja" or "Crítica" for a band code; an unknown code is shown as the server sent it. */
export function bandLabel(code: string): string {
  return isBandCode(code) ? t(`rules.band.${code.toLowerCase() as Lowercase<typeof code>}`) : code;
}
