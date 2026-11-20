import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { assignPriorityRanks, buildSectorRows, moveItem, sameSectorSettings } from './sectorOrder';
import type { SectorRow } from './sectorOrder';
import type { SectorSetting } from './ruleSetParts';

const setting = (
  sectorId: string,
  isPriority: boolean,
  priorityRank: number | null,
  isIncluded = true,
): SectorSetting => ({ sectorId, isIncluded, isPriority, priorityRank });

const row = (sectorId: string, isPriority: boolean, isIncluded = true): SectorRow => ({
  sectorId,
  isIncluded,
  isPriority,
});

const TWO = 2;
const THREE = 3;
const UP = -1;

describe('buildSectorRows', () => {
  it('puts the priority sectors first, by rank, then the rest in the order received', () => {
    const rows = buildSectorRows(
      [
        setting('a', false, null),
        setting('b', true, TWO),
        setting('c', true, 1),
        setting('d', false, null),
      ],
      [],
    );

    expect(rows.map((value) => value.sectorId)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('adds sectors the version does not mention, included and without priority', () => {
    const rows = buildSectorRows([setting('a', true, 1)], ['a', 'z']);

    expect(rows).toEqual([row('a', true), row('z', false)]);
  });

  it('keeps a sector that is no longer in the aqueduct list', () => {
    expect(
      buildSectorRows([setting('gone', false, null)], ['a']).map((value) => value.sectorId),
    ).toEqual(['gone', 'a']);
  });

  it('keeps the included flag', () => {
    expect(buildSectorRows([setting('a', false, null, false)], [])[0]?.isIncluded).toBe(false);
  });
});

describe('assignPriorityRanks', () => {
  it('ranks the priority sectors 1, 2, 3 by their place in the list and leaves the rest without rank', () => {
    const ranked = assignPriorityRanks([
      row('a', true),
      row('b', false),
      row('c', true),
      row('d', true),
    ]);

    expect(ranked.map((value) => value.priorityRank)).toEqual([1, null, TWO, THREE]);
  });

  it('gives no rank to a list without priority sectors', () => {
    expect(
      assignPriorityRanks([row('a', false)]).every((value) => value.priorityRank === null),
    ).toBe(true);
  });

  it('ranks are always unique and consecutive from 1 (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 12 }), (flags) => {
        const ranks = assignPriorityRanks(flags.map((flag, index) => row(String(index), flag)))
          .map((value) => value.priorityRank)
          .filter((value): value is number => value !== null);

        expect(ranks).toEqual(ranks.map((_, index) => index + 1));
      }),
    );
  });
});

describe('moveItem', () => {
  it('moves up and down', () => {
    expect(moveItem(['a', 'b', 'c'], 1, UP)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('does nothing at the ends or outside the list, and never changes the original', () => {
    const original = ['a', 'b'];

    expect(moveItem(original, 0, UP)).toEqual(['a', 'b']);
    expect(moveItem(original, 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(original, THREE, UP)).toEqual(['a', 'b']);
    expect(original).toEqual(['a', 'b']);
  });

  it('keeps the same items in any move (property)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        fc.constantFrom(UP, 1),
        (items, index, delta) => {
          expect([...moveItem(items, index, delta)].sort()).toEqual([...items].sort());
        },
      ),
    );
  });
});

describe('sameSectorSettings', () => {
  it('ignores the order of the list', () => {
    expect(
      sameSectorSettings(
        [setting('a', true, 1), setting('b', false, null)],
        [setting('b', false, null), setting('a', true, 1)],
      ),
    ).toBe(true);
  });

  it.each([
    ['a flag', [setting('a', true, 1, false)], [setting('a', true, 1)]],
    ['a rank', [setting('a', true, TWO)], [setting('a', true, 1)]],
    ['the size', [setting('a', true, 1)], []],
  ])('notices a difference in %s', (_name, left, right) => {
    expect(sameSectorSettings(left, right)).toBe(false);
  });
});
