import { reserveDays } from '../../core/autopilot/reserveDays';
import { t } from '../../i18n/t';
import type { TankStatusView } from '../../services/api/views';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useServiceToday } from '../../state/hooks/useServiceToday';

const SINGLE_DAY = 1;

/**
 * How long the water lasts before the reserve, in words: by the median of the forecast. Said as
 * "Sin pronóstico" when there is no forecast to count with.
 */
export function useReserveText(status: TankStatusView): string {
  const rules = useCurrentRuleSet();
  const today = useServiceToday();
  const result = reserveDays({
    today,
    currentLevel: status.level?.value.value ?? null,
    reserveLevel: rules.data?.reserveLevel ?? null,
    points: (status.forecast?.points ?? []).map((point) => ({
      dayKey: point.targetDate,
      p50: point.p50,
    })),
  });
  if (result === null || (result.atLeast && result.days === 0)) {
    return t('board.kpis.reserveUnknown');
  }
  if (result.days === 0 && !result.atLeast) {
    return t('board.kpis.reserveNow');
  }
  const days = String(result.days);
  if (result.atLeast) {
    return t('board.kpis.reserveAtLeast', { days });
  }
  return result.days === SINGLE_DAY
    ? t('board.kpis.reserveDaysOne')
    : t('board.kpis.reserveDays', { days });
}
