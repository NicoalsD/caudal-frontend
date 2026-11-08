import type { JSX } from 'react';
import { Clock, Droplets, Hourglass } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { RuleSetView, TankStatusView } from '../../services/api/views';
import { StatTile } from '../../ui/cards/StatTile';
import { cn } from '../../ui/styles/cn';
import { levelDelta } from './levelDelta';
import { HOURS_DIGITS, serviceHoursOf } from './tankText';
import styles from './TankStatus.module.css';
import { useReserveText } from './useReserveText';

const LEVEL_DIGITS = 2;

/** Three pastel tiles under the tank: the level, the hours of service and the days of reserve. */
export function TankTiles({
  status,
  rules,
}: {
  readonly status: TankStatusView;
  readonly rules: RuleSetView | undefined;
}): JSX.Element {
  const reserve = useReserveText(status);
  const level = status.level?.value.value ?? null;
  const hours = serviceHoursOf(status, rules);
  const delta = levelDelta(status.trend);
  return (
    <div className={cn(styles.tiles)} role="group" aria-label={t('board.kpis.label')}>
      <StatTile
        icon={Droplets}
        tint="aqua"
        label={t('board.kpis.level')}
        value={
          level === null
            ? t('board.kpis.noLevel')
            : t('board.kpis.levelValue', { level: formatDecimal(level, LEVEL_DIGITS) })
        }
        {...(delta === undefined ? {} : { delta })}
      />
      <StatTile
        icon={Clock}
        tint="mint"
        label={t('tankStatus.tileService')}
        value={
          hours === null
            ? t('board.kpis.noBand')
            : t('tankStatus.tileServiceValue', { hours: formatDecimal(hours, HOURS_DIGITS) })
        }
        footer={
          status.band === null
            ? undefined
            : t('tankStatus.tileBand', { band: bandLabel(status.band.code) })
        }
      />
      <StatTile icon={Hourglass} tint="cream" label={t('board.kpis.reserve')} value={reserve} />
    </div>
  );
}
