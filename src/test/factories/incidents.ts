import type { components } from '../../services/api/schema';

export type IncidentDto = components['schemas']['Incident'];

export const INCIDENT_ID_A = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81';
export const INCIDENT_ID_B = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a82';
export const INCIDENT_ID_C = '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a83';

/** A damage report as the Board list sends it (API.md 12.1). Neutral texts. */
export function buildIncident(overrides: Partial<IncidentDto> = {}): IncidentDto {
  return {
    id: INCIDENT_ID_A,
    source: 'PUBLIC_FORM',
    category_code: 'LEAK',
    sector_id: null,
    description: 'Hay agua saliendo del tubo de la calle principal.',
    location_hint: 'Esquina de la tienda',
    status: 'REPORTED',
    reported_at: '2026-10-09T14:30:00Z',
    ...overrides,
  };
}
