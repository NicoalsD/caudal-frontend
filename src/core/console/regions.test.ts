import { describe, expect, it } from 'vitest';

import { buildNetwork } from '../network/buildNetwork';
import type { LiveValve } from '../scene/sceneModel';
import { groupByRegion, regionOfValve, regionState } from './regions';

const HALF = 0.5;
const FULL = 1;
const THREE_QUARTERS = 0.75;

const sector = (id: string, parent: string | null, isActive = true) => ({
  id,
  code: id.toUpperCase(),
  name: `Región ${id}`,
  parentSectorId: parent,
  householdsCount: 2,
  isActive,
});

const root = buildNetwork(
  [],
  [
    sector('north', null),
    sector('north-low', 'north'),
    sector('south', null),
    sector('old', null, false),
  ],
  new Map(),
);

const live = (
  id: string,
  sectorId: string,
  state: LiveValve['state'],
  flow = 0,
  status: NonNullable<LiveValve['command']>['status'] | null = null,
): LiveValve => ({
  id,
  code: id,
  name: `Llave ${id}`,
  sectorId,
  sectorName: sectorId,
  isMotorized: true,
  isActive: true,
  state,
  command: status === null ? null : { id: `c-${id}`, action: 'OPEN', status },
  flow,
});

describe('regionState', () => {
  it('reads empty, unknown, open, closed and mixed', () => {
    expect(regionState([])).toBe('EMPTY');
    expect(regionState([live('a', 's', 'OPEN'), live('b', 's', 'UNKNOWN')])).toBe('UNKNOWN');
    expect(regionState([live('a', 's', 'OPEN'), live('b', 's', 'OPEN')])).toBe('OPEN');
    expect(regionState([live('a', 's', 'CLOSED')])).toBe('CLOSED');
    expect(regionState([live('a', 's', 'OPEN'), live('b', 's', 'CLOSED')])).toBe('MIXED');
  });
});

describe('groupByRegion', () => {
  const valves = [
    live('v1', 'north', 'OPEN', FULL),
    live('v2', 'north-low', 'OPEN', HALF, 'PENDING'),
    live('v3', 'south', 'CLOSED', 0, 'FAILED'),
    live('v4', 'old', 'OPEN', FULL),
  ];
  const regions = groupByRegion(root, valves);

  it('keeps only the active root sectors, in network order', () => {
    expect(regions.map((region) => region.id)).toEqual(['north', 'south']);
  });

  it('gathers the valves of nested sectors into their region', () => {
    expect(regions[0]?.valves.map((valve) => valve.id)).toEqual(['v1', 'v2']);
    expect(regions[0]).toMatchObject({
      state: 'OPEN',
      flow: THREE_QUARTERS,
      commandInFlight: true,
      commandFailed: false,
    });
  });

  it('flags a failed command', () => {
    expect(regions[1]).toMatchObject({ state: 'CLOSED', flow: 0, commandFailed: true });
  });

  it('gives an empty region no flow', () => {
    const [north] = groupByRegion(root, []);
    expect(north).toMatchObject({ state: 'EMPTY', flow: 0 });
  });

  it('finds the region of a valve', () => {
    expect(regionOfValve(regions, 'v2')?.id).toBe('north');
    expect(regionOfValve(regions, 'v4')).toBeNull();
    expect(regionOfValve(regions, null)).toBeNull();
  });
});
