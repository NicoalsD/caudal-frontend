import type { JSX } from 'react';
import { Clock, Gauge, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { formatDecimal } from '../../../core/format/decimal';
import { bandLabel } from '../../../i18n/bandLabel';
import { t } from '../../../i18n/t';
import type { LiveAqueduct } from '../../../state/hooks/useLiveAqueduct';
import { cn } from '../../../ui/styles/cn';
import styles from './Console.module.css';

const PERCENT = 100;
const WHOLE = 0;
const LEVEL_DIGITS = 2;

const TREND = {
  DOWN: { icon: TrendingDown, text: 'tankStatus.trendDown' },
  STABLE: { icon: Minus, text: 'tankStatus.trendStable' },
  UP: { icon: TrendingUp, text: 'tankStatus.trendUp' },
} as const;

/**
 * The level of the tank over the scene: the percent in large type with the meters and the age of
 * the reading under it, then the band and the trend. A stale reading says so in words.
 */
export function LevelReadout({ aqueduct }: { readonly aqueduct: LiveAqueduct }): JSX.Element {
  const { level, status, tank } = aqueduct;
  const trend = status?.trend?.label ?? null;
  const TrendIcon = trend === null ? Minus : TREND[trend].icon;
  const hours = status?.level?.hoursAgo ?? null;
  const stale = status?.stale.isStale ?? false;
  return (
    <section className={cn(styles.readout)} aria-labelledby="console-level-title">
      <h2 id="console-level-title" className={cn(styles.readoutName)}>
        {tank.name}
      </h2>
      <p className={cn(styles.readoutValue)}>
        <span className={cn(styles.visuallyHidden)}>{t('console.levelLabel')}</span>
        {level === null
          ? t('console.levelNone')
          : t('console.levelPercent', {
              percent: formatDecimal(aqueduct.levelFraction * PERCENT, WHOLE),
            })}
      </p>
      {level === null ? null : (
        <p className={cn(styles.readoutLine)}>
          {hours !== null && hours >= 1
            ? t('console.levelLine', {
                level: formatDecimal(level, LEVEL_DIGITS),
                hours: formatDecimal(hours, WHOLE),
              })
            : t('console.levelLineNow', { level: formatDecimal(level, LEVEL_DIGITS) })}
        </p>
      )}
      <ul className={cn(styles.readoutFacts)}>
        {status?.band == null ? null : (
          <li>
            <Gauge aria-hidden="true" />
            {t('home.heroBand', { band: bandLabel(status.band.code) })}
          </li>
        )}
        <li>
          <TrendIcon aria-hidden="true" />
          {trend === null ? t('home.heroNoTrend') : t(TREND[trend].text)}
        </li>
        {stale && status !== null ? (
          <li className={cn(styles.readoutStale)}>
            <Clock aria-hidden="true" />
            {t('console.stale')}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
