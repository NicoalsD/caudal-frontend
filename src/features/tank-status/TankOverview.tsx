import type { JSX } from 'react';

import type { TankStatusView, TankView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import { t } from '../../i18n/t';
import { Card } from '../../ui/cards/Card';
import { LevelChartCard } from './LevelChartCard';
import { TankFacts } from './TankFacts';
import { TankHero } from './TankHero';
import { TankTiles } from './TankTiles';
import styles from './TankStatus.module.css';
import { useTankDay } from './useTankDay';

/**
 * The tank screen: the tank at the left with its slider of days, and at the right the tiles that
 * answer the first questions (how much, how many hours, how long) and the chart with the forecast.
 */
export function TankOverview({
  tank,
  status,
}: {
  readonly tank: TankView;
  readonly status: TankStatusView;
}): JSX.Element {
  const day = useTankDay(tank, status);
  return (
    <div className={cn(styles.overview)}>
      <div className={cn(styles.tankColumn)}>
        <TankHero tank={tank} status={status} rules={day.rules} day={day} />
        <Card variant="tinted" tint="mint" as="section" aria-label={t('tankStatus.cardTitle')}>
          <TankFacts status={status} rules={day.rules} />
        </Card>
      </div>
      <div className={cn(styles.side)}>
        <TankTiles status={status} rules={day.rules} />
        <LevelChartCard day={day} withFacts={false} />
      </div>
    </div>
  );
}
