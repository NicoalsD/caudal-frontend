import type { components } from '../../services/api/schema';

export type DeviceDto = components['schemas']['Device'];

export const DEVICE_ID = '0190f3a2-6666-7000-8000-0000000000d1';
export const HOUR_MS = 3_600_000;

/** A registered device as GET /devices returns it. Override what the case needs. */
export function buildDeviceDto(overrides: Partial<DeviceDto> = {}): DeviceDto {
  return {
    id: DEVICE_ID,
    kind: 'LEVEL_SENSOR',
    name: 'Sensor del tanque principal',
    status: 'ACTIVE',
    tank_id: null,
    valve_id: null,
    created_at: '2026-10-08T12:00:00Z',
    last_seen_at: null,
    active_key: null,
    ...overrides,
  };
}
