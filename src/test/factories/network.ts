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
