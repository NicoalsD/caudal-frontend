import type { DecisionStatus } from '../../core/autopilot/autopilotModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';

/** Plain words for the state of a decision: the word is always shown, never only a color. */
export function decisionStatusText(status: DecisionStatus): string {
  return t(`history.status.${lower(status)}`);
}

const DETAIL_CODES = {
  RESERVE_FLOOR: 'history.detail.reserveFloor',
  COMMAND_REFUSED: 'history.detail.commandRefused',
  OPERATOR_ACTIVE: 'history.detail.operatorActive',
} as const;

/** The reason a decision did not run: a known code becomes a sentence, a rejection reason stays. */
export function decisionDetailText(detail: string | null): string | null {
  if (detail === null || detail === '') {
    return null;
  }
  const key = (DETAIL_CODES as Readonly<Record<string, string | undefined>>)[detail];
  return key === undefined ? detail : t(key as (typeof DETAIL_CODES)[keyof typeof DETAIL_CODES]);
}
