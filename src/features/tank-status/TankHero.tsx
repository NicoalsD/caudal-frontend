import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { RuleSetView, TankStatusView, TankView } from '../../services/api/views';
import { TankStage } from '../../ui/tank/TankStage';
import { cn } from '../../ui/styles/cn';
import { LevelTimeline } from './LevelTimeline';
import styles from './TankStatus.module.css';
import type { TankDay } from './useTankDay';

interface TankHeroProps {
  readonly tank: TankView;
  readonly status: TankStatusView;
  readonly rules: RuleSetView | undefined;
  readonly day: TankDay;
}

/**
 * The tank, large, on its deep field, with the slider that moves it through the days of history
 * and forecast. Without a level there is nothing to draw: the slider stands on its own.
 */
export function TankHero({ tank, status, rules, day }: TankHeroProps): JSX.Element {
  const picked = day.picked;
  const timeline = (onDark: boolean): JSX.Element => (
    <LevelTimeline
      rows={day.rows}
      index={day.index}
      defaultIndex={day.defaultIndex}
      todayIndex={day.todayIndex}
      onChange={day.onPick}
      onDark={onDark}
    />
  );
  return (
    <div className={cn(styles.tankCard)}>
      {day.level === null || status.level === null ? (
        <section className={cn(styles.card)}>{timeline(false)}</section>
      ) : (
        <TankStage
          heading={t('tankStatus.stageTitle')}
          level={day.level}
          gaugeMin={tank.gaugeMin}
          gaugeMax={tank.gaugeMax}
          bands={(rules?.bands ?? []).map((item) => ({
            code: item.band,
            from: item.minLevel,
            to: item.maxLevel,
          }))}
          reserveLevel={rules?.reserveLevel ?? null}
          capacityLiters={tank.capacityLiters}
          {...(picked?.rangeLow === undefined ? {} : { rangeLow: picked.rangeLow })}
          {...(picked?.rangeHigh === undefined ? {} : { rangeHigh: picked.rangeHigh })}
        >
          {timeline(true)}
        </TankStage>
      )}
    </div>
  );
}
