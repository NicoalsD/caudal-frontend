import { useState } from 'react';
import type { JSX } from 'react';

import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { useLatestForecast, useTankHistory } from '../../state/hooks/useTankStatus';
import type { TankStatusView, TankView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import { ForecastSection } from './ForecastSection';
import { toForecastRows } from './forecastRows';
import { defaultIndexOf } from './levelTimeline';
import { TankStatusCard } from './TankStatusCard';
import styles from './TankStatus.module.css';

/**
 * The tank and the chart side by side. The slider's day lives here, so the tank, the sentence and
 * the chart's vertical mark always agree.
 */
export function TankOverview({
  tank,
  status,
  variant = 'pair',
}: {
  readonly tank: TankView;
  readonly status: TankStatusView;
  readonly variant?: 'pair' | 'console';
}): JSX.Element {
  const rules = useCurrentRuleSet();
  const forecast = useLatestForecast(tank.id);
  const history = useTankHistory(tank.id);
  const today = useServiceToday();
  const [pickedDayKey, setPickedDayKey] = useState<string | null>(null);

  const observed = status.level;
  const rows = toForecastRows(
    observed === null ? null : { dayKey: observed.observedAt.dayKey, value: observed.value.value },
    (forecast.data?.points ?? []).map((point) => ({
      dayKey: point.targetDate,
      p10: point.p10,
      p50: point.p50,
      p90: point.p90,
    })),
    (history.data ?? []).map((reading) => ({
      dayKey: reading.observedAt.dayKey,
      observedAt: reading.observedAt.date,
      value: reading.level,
    })),
  );
  const defaultIndex = defaultIndexOf(rows, observed?.observedAt.dayKey ?? null);
  const pickedIndex = rows.findIndex((row) => row.dayKey === pickedDayKey);
  const index = pickedIndex >= 0 ? pickedIndex : defaultIndex;
  const selectedDayKey =
    rows.length > 1 && index !== defaultIndex ? (rows[index]?.dayKey ?? null) : null;

  return (
    <div className={cn(styles.overview, variant === 'console' && styles.overviewConsole)}>
      <TankStatusCard
        tank={tank}
        status={status}
        rules={rules.data}
        rows={rows}
        index={index}
        defaultIndex={defaultIndex}
        todayIndex={rows.findIndex((row) => row.dayKey === today)}
        askPlumber={variant === 'console'}
        onPick={(next) => {
          setPickedDayKey(next === defaultIndex ? null : (rows[next]?.dayKey ?? null));
        }}
      />
      <ForecastSection
        tank={tank}
        forecast={forecast}
        historyFailed={history.isError}
        rows={rows}
        rules={rules.data}
        selectedDayKey={selectedDayKey}
      />
    </div>
  );
}
