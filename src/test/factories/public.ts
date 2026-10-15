import type { components } from '../../services/api/schema';

export type PublicScheduleDto = components['schemas']['PublicSchedule'];

/** A published schedule with two sectors. Neutral values, not a real aqueduct. */
export function buildPublicSchedule(overrides: Partial<PublicScheduleDto> = {}): PublicScheduleDto {
  return {
    aqueduct: { name: 'Guaitarilla', is_demo: false },
    service_date: '2026-10-10',
    publication: {
      id: '0190f3a2-7c1d-7b2e-9f11-3d4c5e6f7a81',
      published_at: '2026-10-09T12:15:00Z',
    },
    items: [
      {
        sector_name: 'Sector Alto',
        start_at: '2026-10-10T11:00:00Z',
        end_at: '2026-10-10T19:00:00Z',
      },
      {
        sector_name: 'Sector Centro',
        start_at: '2026-10-10T19:00:00Z',
        end_at: '2026-10-11T03:00:00Z',
      },
    ],
    ...overrides,
  };
}
