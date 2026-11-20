import { useState } from 'react';

import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { useLatestForecast } from '../../state/hooks/useTankStatus';
import type { TankStatusView, TankView } from '../../services/api/views';
import { toForecastRows } from './forecastRows';
import type { ForecastRow } from './forecastRows';
import { defaultIndexOf, selectionOf } from './levelTimeline';
import type { DaySelection } from './levelTimeline';
import { rowsInRange } from './panoramaRange';
import type { PanoramaRange } from './panoramaRange';
import { useLevelHistory } from './useLevelHistory';

/** Everything the tank and the chart share while a person moves the slider through the days. */
export interface TankDay {
  readonly tank: TankView;
  readonly status: TankStatusView;
  readonly rules: ReturnType<typeof useCurrentRuleSet>['data'];
  readonly forecast: ReturnType<typeof useLatestForecast>;
  readonly historyFailed: boolean;
  readonly rows: readonly ForecastRow[];
  readonly index: number;
  readonly defaultIndex: number;
  readonly todayIndex: number;
  /** The day marked on the chart, or null while the slider rests on the day of the last reading. */
  readonly selectedDayKey: string | null;
  readonly picked: DaySelection | null;
  /** The level the tank shows: the picked day's, or the last reading. */
  readonly level: number | null;
  readonly onPick: (index: number) => void;
}

/**
 * The rows of the chart (history, last reading and forecast, cut to the range) and the day the
 * slider points at. The tank, the sentence and the chart's vertical mark always agree.
 */
export function useTankDay(
  tank: TankView,
  status: TankStatusView,
  range: PanoramaRange = 'month',
): TankDay {
  const rules = useCurrentRuleSet();
  const forecast = useLatestForecast(tank.id);
  const history = useLevelHistory(tank.id);
  const today = useServiceToday();
  const [pickedDayKey, setPickedDayKey] = useState<string | null>(null);

  const observed = status.level;
  const all = toForecastRows(
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
  const rows = rowsInRange(all, range, today);
  const defaultIndex = defaultIndexOf(rows, observed?.observedAt.dayKey ?? null);
  const pickedIndex = rows.findIndex((row) => row.dayKey === pickedDayKey);
  const index = pickedIndex >= 0 ? pickedIndex : defaultIndex;
  const row = rows[index];
  const picked = row === undefined || index === defaultIndex ? null : selectionOf(row);
  return {
    tank,
    status,
    rules: rules.data,
    forecast,
    historyFailed: history.isError,
    rows,
    index,
    defaultIndex,
    todayIndex: rows.findIndex((item) => item.dayKey === today),
    selectedDayKey: rows.length > 1 && index !== defaultIndex ? (row?.dayKey ?? null) : null,
    picked,
    level: picked?.level ?? observed?.value.value ?? null,
    onPick: (next) => {
      setPickedDayKey(next === defaultIndex ? null : (rows[next]?.dayKey ?? null));
    },
  };
}
