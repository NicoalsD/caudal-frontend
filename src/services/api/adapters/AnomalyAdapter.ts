import type { AnomalyKind, AnomalyPageView, AnomalyStatus, AnomalyView } from '../views';
import type { ApiDtoAdapter } from './ApiDtoAdapter';
import { InvalidDtoError } from './InvalidDtoError';

/** Shapes of API.md section 9 (hand written: the generated schema is the source for the type). */
export interface AnomalyDto {
  readonly id: string;
  readonly kind: string;
  readonly status: string;
  readonly detected_at: string;
  readonly evidence?: Readonly<Record<string, unknown>> | null;
  readonly resolution_note?: string | null;
}

export interface AnomalyPageDto {
  readonly items: readonly AnomalyDto[];
  readonly next_cursor?: string | null;
}

const KINDS: readonly AnomalyKind[] = [
  'POSSIBLE_LEAK',
  'SENSOR_FAULT',
  'STALE_DATA',
  'SUSPECTED_DUPLICATE',
  'ABNORMAL_DROP',
];
const STATUSES: readonly AnomalyStatus[] = ['OPEN', 'CONFIRMED', 'DISMISSED'];

function isKind(value: string): value is AnomalyKind {
  return (KINDS as readonly string[]).includes(value);
}

function isStatus(value: string): value is AnomalyStatus {
  return (STATUSES as readonly string[]).includes(value);
}

/** The level in the evidence, when the server sends one as a number; otherwise none is shown. */
function gaugeFrom(
  adapter: ApiDtoAdapter,
  evidence: AnomalyDto['evidence'],
): AnomalyView['gaugeValue'] {
  const value = evidence?.gauge_value;
  return typeof value === 'number' ? adapter.toDecimal('evidence.gauge_value', value) : null;
}

export function toAnomaly(adapter: ApiDtoAdapter, dto: AnomalyDto): AnomalyView {
  if (!isKind(dto.kind)) {
    throw new InvalidDtoError('anomaly.kind');
  }
  if (!isStatus(dto.status)) {
    throw new InvalidDtoError('anomaly.status');
  }
  return {
    id: dto.id,
    kind: dto.kind,
    status: dto.status,
    detectedAt: adapter.toTimestamp('anomaly.detected_at', dto.detected_at),
    gaugeValue: gaugeFrom(adapter, dto.evidence),
    resolutionNote: dto.resolution_note ?? null,
  };
}

export function toAnomalyPage(adapter: ApiDtoAdapter, dto: AnomalyPageDto): AnomalyPageView {
  return {
    items: dto.items.map((item) => toAnomaly(adapter, item)),
    nextCursor: dto.next_cursor ?? null,
  };
}
