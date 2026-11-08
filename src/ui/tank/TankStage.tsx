import { useId } from 'react';
import type { JSX, ReactNode } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import { TankGauge } from './TankGauge';
import type { TankGaugeProps } from './TankGauge';
import styles from './TankStage.module.css';

const LEVEL_DIGITS = 2;
const WHOLE_DIGITS = 0;
const PERCENT = 100;

export interface TankStageProps extends TankGaugeProps {
  /** Null when the tank has no capacity on record: the liters are then left out, not invented. */
  readonly capacityLiters: number | null;
  readonly heading: string;
  /** Goes under the tank, on the same deep field (the slider of days). */
  readonly children?: ReactNode;
}

/**
 * The tank as the piece that leads the screen: on the deep brand field, with what a person asks
 * first (meters, how full, how much water) beside the cylinder. The liters assume straight walls,
 * so they are always shown as approximate.
 */
export function TankStage({
  capacityLiters,
  heading,
  children,
  ...gauge
}: TankStageProps): JSX.Element {
  const headingId = useId();
  const span = gauge.gaugeMax - gauge.gaugeMin;
  const fraction = span > 0 ? Math.min(1, Math.max(0, (gauge.level - gauge.gaugeMin) / span)) : 0;
  return (
    <section className={cn(styles.stage)} aria-labelledby={headingId}>
      <h2 id={headingId} className={cn(styles.heading)}>
        {heading}
      </h2>
      <div className={cn(styles.body)}>
        <dl className={cn(styles.figures)}>
          <div className={cn(styles.figure, styles.figureMain)}>
            <dt>{t('tankStage.height')}</dt>
            <dd>{t('tankStage.meters', { value: formatDecimal(gauge.level, LEVEL_DIGITS) })}</dd>
          </div>
          <div className={cn(styles.figure)}>
            <dt>{t('tankStage.full')}</dt>
            <dd>
              {t('tankStage.percent', { value: formatDecimal(fraction * PERCENT, WHOLE_DIGITS) })}
            </dd>
          </div>
          {capacityLiters === null ? null : (
            <div className={cn(styles.figure)}>
              <dt>{t('tankStage.volume')}</dt>
              <dd>
                {t('tankStage.liters', {
                  value: formatDecimal(fraction * capacityLiters, WHOLE_DIGITS),
                })}
              </dd>
            </div>
          )}
        </dl>
        <div className={cn(styles.gauge)}>
          <TankGauge {...gauge} />
        </div>
      </div>
      {children}
    </section>
  );
}
