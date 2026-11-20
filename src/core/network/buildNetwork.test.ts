import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildNetwork } from './buildNetwork';
import type { SectorInput, TankInput, ValveInput } from './buildNetwork';
import { SectorNode, ValveNode } from './nodes';

const tank = (id: string, isActive = true): TankInput => ({
  id,
  name: `Tanque ${id}`,
  isActive,
  gaugeMin: 0,
  gaugeMax: 5,
  capacityLiters: null,
});

const sector = (
  id: string,
  parentSectorId: string | null = null,
  householdsCount = 0,
  isActive = true,
): SectorInput => ({
  id,
  code: id.toUpperCase(),
  name: `Sector ${id}`,
  parentSectorId,
  householdsCount,
  isActive,
});

const valve = (id: string, isActive = true): ValveInput => ({
  id,
  code: id.toUpperCase(),
  name: `Válvula ${id}`,
  locationHint: null,
  isMotorized: false,
  failSafePosition: 'KEEP',
  isActive,
});

const TWELVE = 12;
const THIRTY = 30;
const FIVE = 5;
const THREE = 3;
const TWO = 2;

describe('buildNetwork', () => {
  const root = buildNetwork(
    [tank('t1'), tank('t2', false)],
    [
      sector('escuela', null, TWELVE),
      sector('alto', null, THIRTY),
      sector('alto-norte', 'alto', FIVE),
    ],
    new Map([
      ['escuela', [valve('v1')]],
      ['alto', [valve('v2'), valve('v3', false)]],
      ['alto-norte', [valve('v4')]],
    ]),
  );

  it('puts tanks and top-level sectors under the root', () => {
    expect(root.children().map((node) => node.kind)).toEqual(['tank', 'tank', 'sector', 'sector']);
    expect(root.tankCount()).toBe(TWO);
  });

  it('nests a sub-sector under its parent, after the parent valves', () => {
    const alto = root.sectorNodes().find((node) => node.id === 'alto');

    expect(alto?.children().map((node) => `${node.kind}:${node.id}`)).toEqual([
      'valve:v2',
      'valve:v3',
      'sector:alto-norte',
    ]);
  });

  it('adds up the questions of the Composite from the leaves to the root', () => {
    const alto = root.sectorNodes().find((node) => node.id === 'alto');

    expect(alto?.valveCount()).toBe(THREE);
    expect(alto?.activeValveCount()).toBe(TWO);
    expect(alto?.householdCount()).toBe(THIRTY + FIVE);
    expect(alto?.directHouseholds()).toBe(THIRTY);
    expect(root.valveCount()).toBe(FIVE - 1);
    expect(root.activeValveCount()).toBe(THREE);
    expect(root.sectorCount()).toBe(THREE);
    expect(root.householdCount()).toBe(TWELVE + THIRTY + FIVE);
  });

  it('leaves answer for themselves: a valve is one valve, a tank has none', () => {
    const v = new ValveNode('v', 'V', false, 'V', null, true, 'OPEN');

    expect([v.valveCount(), v.activeValveCount(), v.sectorCount(), v.householdCount()]).toEqual([
      1, 0, 0, 0,
    ]);
    expect(root.tankNodes()[0]?.valveCount()).toBe(0);
    expect(root.tankNodes()[0]?.children()).toEqual([]);
  });

  it('shows a sector whose parent does not exist at the top', () => {
    const lost = buildNetwork([], [sector('a', 'no-existe')], new Map());

    expect(lost.sectorNodes().map((node) => node.id)).toEqual(['a']);
  });

  it('cuts a parent loop instead of drawing it forever', () => {
    const loop = buildNetwork(
      [],
      [sector('a', 'b'), sector('b', 'a'), sector('c', 'a')],
      new Map(),
    );

    expect(loop.sectorCount()).toBe(THREE);
    expect(loop.sectorNodes()).toHaveLength(THREE);
  });

  it('an empty network answers zero everywhere', () => {
    const empty = buildNetwork([], [], new Map());

    expect([
      empty.valveCount(),
      empty.sectorCount(),
      empty.householdCount(),
      empty.tankCount(),
    ]).toEqual([0, 0, 0, 0]);
  });

  it('every sector appears exactly once, whatever the parents are (property)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.integer({ min: 0, max: 7 }), { nil: null }), {
          minLength: 1,
          maxLength: 8,
        }),
        (parents) => {
          const sectors = parents.map((parent, index) =>
            sector(String(index), parent === null ? null : String(parent)),
          );
          const network = buildNetwork([], sectors, new Map());

          expect(network.sectorCount()).toBe(sectors.length);
        },
      ),
    );
  });

  it('exposes SectorNode.addSector for manual trees', () => {
    const parent = new SectorNode('p', 'P', true, 'P', 1);
    parent.addSector(new SectorNode('c', 'C', true, 'C', TWO));

    expect(parent.sectorCount()).toBe(TWO);
    expect(parent.householdCount()).toBe(THREE);
  });
});
