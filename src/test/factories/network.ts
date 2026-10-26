import type { components } from '../../services/api/schema';
import { SECTOR_HIGH_ID, SECTOR_LOW_ID, SECTOR_SCHOOL_ID } from './rules';

export type SectorDto = components['schemas']['Sector'];

export const SEED_SECTORS_LIST: SectorDto[] = [
  {
    id: SECTOR_SCHOOL_ID,
    code: 'ESCUELA',
    name: 'Sector Escuela',
    parent_sector_id: null,
    households_count: 12,
    is_active: true,
  },
  {
    id: SECTOR_HIGH_ID,
    code: 'ALTO',
    name: 'Sector Alto',
    parent_sector_id: null,
    households_count: 30,
    is_active: true,
  },
  {
    id: SECTOR_LOW_ID,
    code: 'BAJO',
    name: 'Sector Bajo',
    parent_sector_id: null,
    households_count: 25,
    is_active: true,
  },
];

export type TankDto = components['schemas']['Tank'];
export type ValveDto = components['schemas']['Valve'];

export const TANK_ID = '0190f3a2-0000-7000-8000-0000000000e1';

export const SEED_TANKS: TankDto[] = [
  {
    id: TANK_ID,
    name: 'Tanque principal',
    gauge_min: 0,
    gauge_max: 5,
    gauge_step: 0.01,
    capacity_liters: 20000,
    is_active: true,
  },
];

export const SEED_VALVES: Record<string, ValveDto[]> = {
  [SECTOR_SCHOOL_ID]: [
    {
      id: '0190f3a2-0000-7000-8000-0000000000f1',
      code: 'V1',
      name: 'Válvula escuela',
      location_hint: 'Junto a la cancha',
      is_motorized: false,
      fail_safe_position: 'KEEP',
      is_active: true,
    },
  ],
  [SECTOR_HIGH_ID]: [
    {
      id: '0190f3a2-0000-7000-8000-0000000000f2',
      code: 'V2',
      name: 'Válvula alta',
      location_hint: null,
      is_motorized: true,
      fail_safe_position: 'CLOSED',
      is_active: true,
    },
    {
      id: '0190f3a2-0000-7000-8000-0000000000f3',
      code: 'V3',
      name: 'Válvula alta 2',
      location_hint: null,
      is_motorized: false,
      fail_safe_position: 'OPEN',
      is_active: false,
    },
  ],
};
