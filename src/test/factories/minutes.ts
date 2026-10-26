import type { components } from '../../services/api/schema';

export type MinutesDto = components['schemas']['Minutes'];
export type MinutesSummaryDto = components['schemas']['MinutesSummary'];

export const MINUTES_ID_A = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81';
export const MINUTES_ID_B = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a82';
export const MINUTES_ID_C = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a83';

/** One record per epistemic section, in plain words (API.md 13.2). Neutral texts. */
export function buildMinutesContent(): MinutesDto['content'] {
  return {
    observed: [
      {
        source: 'READING',
        source_id: '0190f3a2-1111-7000-8000-000000000001',
        at: '2026-10-07T13:00:00Z',
        summary: 'Lectura del tanque: 2,10 m.',
      },
    ],
    estimated: [
      {
        source: 'FORECAST',
        source_id: '0190f3a2-2222-7000-8000-000000000001',
        at: '2026-10-07T13:00:00Z',
        summary: 'Horas disponibles estimadas: 16.',
      },
    ],
    inferred: [
      {
        source: 'ANOMALY',
        source_id: '0190f3a2-3333-7000-8000-000000000001',
        at: '2026-10-08T09:00:00Z',
        summary: 'Posible fuga en el sector Alto.',
      },
    ],
    confirmed: [],
  };
}

/** A draft acta (API.md 13.1). `finalized_at` and `pdf_sha256` stay null. */
export function buildMinutes(overrides: Partial<MinutesDto> = {}): MinutesDto {
  return {
    id: MINUTES_ID_A,
    period_from: '2026-10-01',
    period_to: '2026-10-07',
    status: 'DRAFT',
    content: buildMinutesContent(),
    generated_by: '0190f3a2-cccc-7000-8000-000000000002',
    generated_at: '2026-10-08T14:00:00Z',
    pdf_sha256: null,
    audit_head_hash: null,
    finalized_by: null,
    finalized_at: null,
    ...overrides,
  };
}

/** The row of an acta in the list (API.md 13.8): the same acta without its sections. */
export function summaryOf(acta: MinutesDto): MinutesSummaryDto {
  return {
    id: acta.id,
    period_from: acta.period_from,
    period_to: acta.period_to,
    status: acta.status,
    generated_at: acta.generated_at,
    finalized_at: acta.finalized_at ?? null,
    pdf_sha256: acta.pdf_sha256 ?? null,
  };
}
