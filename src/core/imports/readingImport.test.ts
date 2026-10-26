import { describe, expect, it } from 'vitest';

import { toReadingImportFile } from './readingImport';

const HEADER = 'id,tank_id,gauge_value,water_appearance_code,damage_noticed,observed_at';
const TANK = '0190f3a2-0000-7000-8000-0000000000e1';

describe('toReadingImportFile', () => {
  it('turns each line into a reading with typed values', () => {
    const file = toReadingImportFile([
      HEADER.split(','),
      ['r-1', TANK, '2.4', 'NORMAL', 'true', '2026-10-01T08:00:00-05:00'],
      ['r-2', TANK, '3,1', 'MUDDY', '0', '2026-10-01T09:00:00-05:00'],
    ]);

    expect(file.missingColumns).toEqual([]);
    expect(file.rows).toEqual([
      {
        id: 'r-1',
        tank_id: TANK,
        gauge_value: 2.4,
        water_appearance_code: 'NORMAL',
        damage_noticed: true,
        observed_at: '2026-10-01T08:00:00-05:00',
      },
      {
        id: 'r-2',
        tank_id: TANK,
        gauge_value: '3,1',
        water_appearance_code: 'MUDDY',
        damage_noticed: false,
        observed_at: '2026-10-01T09:00:00-05:00',
      },
    ]);
  });

  it('matches the header by name, in any order, and keeps an optional note', () => {
    const file = toReadingImportFile([
      [
        'observed_at',
        'note',
        'id',
        'tank_id',
        'gauge_value',
        'water_appearance_code',
        'damage_noticed',
      ],
      ['2026-10-01T08:00:00-05:00', 'Se vio barro', 'r-1', TANK, '2.4', 'NORMAL', 'false'],
    ]);

    expect(file.rows[0]).toMatchObject({ id: 'r-1', note: 'Se vio barro', damage_noticed: false });
  });

  it('names the required columns the file does not have, and reads no rows', () => {
    const file = toReadingImportFile([
      ['id', 'gauge_value'],
      ['r-1', '2.4'],
    ]);

    expect(file.missingColumns).toEqual([
      'tank_id',
      'water_appearance_code',
      'damage_noticed',
      'observed_at',
    ]);
    expect(file.rows).toEqual([]);
  });

  it('keeps a value it cannot type as text, so the server refuses it', () => {
    const file = toReadingImportFile([
      HEADER.split(','),
      ['r-1', TANK, 'ocho', 'NORMAL', 'quizás', '2026-10-01T08:00:00-05:00'],
    ]);

    expect(file.rows[0]).toMatchObject({ gauge_value: 'ocho', damage_noticed: 'quizás' });
  });

  it('is empty for an empty table', () => {
    expect(toReadingImportFile([])).toEqual({
      missingColumns: [
        'id',
        'tank_id',
        'gauge_value',
        'water_appearance_code',
        'damage_noticed',
        'observed_at',
      ],
      rows: [],
    });
  });
});
