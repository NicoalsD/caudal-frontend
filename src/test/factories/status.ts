import type { components } from '../../services/api/schema';

export type TankStatusDto = components['schemas']['TankStatus'];

/** A tank state as GET /tanks/{id}/status answers it: a level of 2,3 m taken 6 hours ago. */
export function buildTankStatus(overrides: Partial<TankStatusDto> = {}): TankStatusDto {
  return {
    level: { value: 2.3, observed_at: '2026-10-14T07:15:00-05:00', hours_ago: 6 },
    trend: { slope_per_day: -0.25, label: 'DOWN', label_es: 'viene bajando' },
    stale: { is_stale: false, stale_after_hours: 12 },
    band: { code: 'HIGH', daily_service_hours: 8 },
    forecast: null,
    open_anomalies: 0,
    is_demo: false,
    ...overrides,
  };
}
