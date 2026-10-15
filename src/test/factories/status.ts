import type { components } from '../../services/api/schema';

export type TankStatusDto = components['schemas']['TankStatus'];
export type ForecastRunDto = components['schemas']['ForecastRun'];

/** A tank state as GET /tanks/{id}/status answers it: a level of 2,3 m taken 6 hours ago. */
export function buildTankStatus(overrides: Partial<TankStatusDto> = {}): TankStatusDto {
  return {
    level: { value: 2.3, observed_at: '2026-10-14T07:15:00-05:00', hours_ago: 6 },
    trend: { slope_per_day: -0.25, label: 'DOWN', label_es: 'viene bajando' },
    stale: { is_stale: false, stale_after_hours: 12 },
    band: 'HIGH',
    forecast: null,
    open_anomalies: 0,
    ...overrides,
  };
}

/** The last forecast run for the seed tank: the AI model answered, three days ahead (API.md 8.2). */
export function buildForecastRun(overrides: Partial<ForecastRunDto> = {}): ForecastRunDto {
  return {
    run_id: '6f1d2c3a-0000-4000-8000-000000000001',
    model_name: 'caudal-ia',
    model_version: '1.0.0',
    is_fallback: false,
    fallback_reason: null,
    horizon_days: 2,
    created_at: '2026-10-14T12:00:00-05:00',
    context_from: '2026-10-07T00:00:00-05:00',
    context_to: '2026-10-14T12:00:00-05:00',
    points: [
      { target_date: '2026-10-15', p10: 2.0, p50: 2.2, p90: 2.4 },
      { target_date: '2026-10-16', p10: 1.8, p50: 2.1, p90: 2.4 },
    ],
    ...overrides,
  };
}
