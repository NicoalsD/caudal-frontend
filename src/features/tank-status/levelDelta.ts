import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import type { TankStatusView } from '../../services/api/views';
import type { StatDelta } from '../../ui/cards/StatTile';

const SLOPE_DIGITS = 2;

/** The change per day of the level as a tile's delta: the arrow, the word and the tone agree. */
export function levelDelta(trend: TankStatusView['trend']): StatDelta | undefined {
  if (trend === null) {
    return undefined;
  }
  const slope = trend.slopePerDay;
  const sign = slope > 0 ? '+' : '';
  const text = t('tankStatus.slopePerDay', {
    value: `${sign}${formatDecimal(slope, SLOPE_DIGITS)}`,
  });
  switch (trend.label) {
    case 'DOWN':
      return { text, trend: 'down', tone: 'warn' };
    case 'UP':
      return { text, trend: 'up', tone: 'good' };
    default:
      return { text, trend: 'flat', tone: 'neutral' };
  }
}
