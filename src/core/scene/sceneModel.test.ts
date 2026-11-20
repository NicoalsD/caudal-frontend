import { describe, expect, it } from 'vitest';

import { buildNetwork } from '../network/buildNetwork';
import { buildLiveValves, collectValves } from './sceneModel';

const QUARTER = 0.25;
const HALF_FLOW = 0.5;

const valve = (id: string, isActive = true) => ({
  id,
  code: id.toUpperCase(),
  name: `Llave ${id}`,
  locationHint: null,
  isMotorized: true,
  failSafePosition: 'KEEP' as const,
  isActive,
});
const sector = (id: string, parent: string | null) => ({
  id,
  code: id,
  name: `Sector ${id}`,
  parentSectorId: parent,
  householdsCount: 3,
  isActive: true,
});

const root = buildNetwork(
  [],
  [sector('a', null), sector('b', 'a')],
  new Map([
    ['a', [valve('v1'), valve('v0', false)]],
    ['b', [valve('v2')]],
  ]),
);

describe('collectValves', () => {
  it('walks sub-sectors and keeps the sector of each valve', () => {
    const found = collectValves(root);

    expect(found.map((item) => [item.valve.id, item.sector.id])).toEqual([
      ['v1', 'a'],
      ['v0', 'a'],
      ['v2', 'b'],
    ]);
  });
});

describe('buildLiveValves', () => {
  it('joins live facts, drops inactive valves and scales the flow with the level', () => {
    const valves = buildLiveValves(
      root,
      [{ valveId: 'v1', state: 'OPEN', lastCommand: null }],
      QUARTER,
    );

    expect(valves.map((item) => item.id)).toEqual(['v1', 'v2']);
    expect(valves[0]).toMatchObject({ state: 'OPEN', flow: HALF_FLOW, sectorName: 'Sector a' });
  });

  it('treats a valve with no live fact as UNKNOWN with no flow', () => {
    const [first] = buildLiveValves(root, [], 1);

    expect(first).toMatchObject({ state: 'UNKNOWN', flow: 0, command: null });
  });
});
