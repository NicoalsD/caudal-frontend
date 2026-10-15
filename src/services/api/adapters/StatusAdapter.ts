import type { ForecastPointView, ForecastView, TankStatusView, TrendLabel } from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

/** Shapes of API.md sections 8.1 and 8.2 (hand written: not in the generated schema yet). */
export interface ForecastPointDto {
  readonly target_date: string;
  readonly p10: number;
  readonly p50: number;
  readonly p90: number;
}

export interface ForecastDto {
  readonly run_id?: string | null;
  readonly is_fallback: boolean;
  readonly fallback_reason?: string | null;
  readonly model_name?: string | null;
  readonly created_at?: string | null;
  readonly points: readonly ForecastPointDto[];
}

interface BandObjectDto {
  readonly band?: string;
  readonly code?: string;
  readonly daily_service_hours?: number;
}

export interface TankStatusDto {
  readonly level?: {
    readonly value: number;
    readonly observed_at: string;
    readonly hours_ago: number;
  } | null;
  readonly trend: {
    readonly slope_per_day: number;
    readonly label: string;
    readonly label_es?: string;
  };
  readonly stale: { readonly is_stale: boolean; readonly stale_after_hours: number };
  /** The band of the current level: its code, or an object with the code and its hours. */
  readonly band?: string | BandObjectDto | null;
  readonly forecast?: ForecastDto | null;
  readonly open_anomalies?: number;
  readonly is_demo?: boolean;
}

const TREND_LABELS: readonly string[] = ['DOWN', 'STABLE', 'UP'];

function isTrendLabel(value: string): value is TrendLabel {
  return TREND_LABELS.includes(value);
}

function toBand(band: TankStatusDto['band']): TankStatusView['band'] {
  if (band === undefined || band === null) {
    return null;
  }
  if (typeof band === 'string') {
    return { code: band, serviceHours: null };
  }
  const code = band.band ?? band.code;
  return code === undefined ? null : { code, serviceHours: band.daily_service_hours ?? null };
}

function toPoint(dto: ForecastPointDto): ForecastPointView {
  if (![dto.p10, dto.p50, dto.p90].every(Number.isFinite)) {
    throw new InvalidDtoError('forecast.points');
  }
  return { targetDate: dto.target_date, p10: dto.p10, p50: dto.p50, p90: dto.p90 };
}

export function toForecast(adapter: ApiDtoAdapter, dto: ForecastDto): ForecastView {
  return {
    runId: dto.run_id ?? null,
    isFallback: dto.is_fallback,
    fallbackReason: dto.fallback_reason ?? null,
    modelName: dto.model_name ?? null,
    createdAt:
      dto.created_at === undefined || dto.created_at === null
        ? null
        : adapter.toTimestamp('forecast.created_at', dto.created_at),
    points: [...dto.points.map((point) => toPoint(point))].sort((a, b) =>
      a.targetDate.localeCompare(b.targetDate),
    ),
  };
}

export function toTankStatus(adapter: ApiDtoAdapter, dto: TankStatusDto): TankStatusView {
  return {
    level:
      dto.level === undefined || dto.level === null
        ? null
        : {
            value: adapter.toDecimal('level.value', dto.level.value),
            observedAt: adapter.toTimestamp('level.observed_at', dto.level.observed_at),
            hoursAgo: dto.level.hours_ago,
          },
    trend: {
      slopePerDay: dto.trend.slope_per_day,
      label: isTrendLabel(dto.trend.label) ? dto.trend.label : null,
      labelEs: dto.trend.label_es ?? null,
    },
    stale: { isStale: dto.stale.is_stale, staleAfterHours: dto.stale.stale_after_hours },
    band: toBand(dto.band),
    forecast:
      dto.forecast === undefined || dto.forecast === null
        ? null
        : toForecast(adapter, dto.forecast),
    openAnomalies: dto.open_anomalies ?? 0,
    isDemo: dto.is_demo === true,
  };
}
