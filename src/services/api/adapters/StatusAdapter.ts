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

export interface TankStatusDto {
  readonly level?: {
    readonly value: number;
    readonly observed_at: string;
    readonly hours_ago: number;
  } | null;
  /** Null while there is too little history to draw a line (API.md 8.1). */
  readonly trend?: {
    readonly slope_per_day: number;
    readonly label: string;
    readonly label_es?: string;
  } | null;
  readonly stale: { readonly is_stale: boolean; readonly stale_after_hours: number };
  /** The band of the current level (HIGH, LOW or CRITICAL), null without a level. */
  readonly band?: string | null;
  readonly forecast?: ForecastDto | null;
  readonly open_anomalies?: number;
}

const TREND_LABELS: readonly string[] = ['DOWN', 'STABLE', 'UP'];

function isTrendLabel(value: string): value is TrendLabel {
  return TREND_LABELS.includes(value);
}

/** The API sends the band code only; its hours of service are not part of the status (API.md 8.1). */
function toBand(band: TankStatusDto['band']): TankStatusView['band'] {
  return band === undefined || band === null ? null : { code: band, serviceHours: null };
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
    trend:
      dto.trend === undefined || dto.trend === null
        ? null
        : {
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
  };
}
