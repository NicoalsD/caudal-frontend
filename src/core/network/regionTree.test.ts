import { describe, expect, it } from 'vitest';

import { buildRegionTree, descendantIds, parentOptions } from './regionTree';

const sector = (id: string, parent: string | null) => ({
  id,
  code: id.toUpperCase(),
  name: id,
  parentSectorId: parent,
  isActive: true,
});
const SECTORS = [sector('n', null), sector('a', 'n'), sector('b', 'a'), sector('s', null)];

const DEEP = 2;

describe('regionTree', () => {
  it('puts regions at the top and sectors under their parent', () => {
    const tree = buildRegionTree(SECTORS);
    expect(tree.map((node) => node.sector.id)).toEqual(['n', 's']);
    expect(tree[0]?.children[0]?.children[0]?.sector.id).toBe('b');
  });

  it('shows an orphan as a region and never loops on a cycle', () => {
    const tree = buildRegionTree([sector('o', 'missing'), sector('x', 'y'), sector('y', 'x')]);
    expect(tree.map((node) => node.sector.id)).toEqual(['o']);
  });

  it('does not offer a sector itself or its descendants as a parent', () => {
    expect([...descendantIds('n', SECTORS)].sort()).toEqual(['a', 'b']);
    expect(parentOptions(SECTORS[0]!, SECTORS).map((s) => s.id)).toEqual(['s']);
    expect(parentOptions(SECTORS[DEEP]!, SECTORS).map((s) => s.id)).toEqual(['n', 'a', 's']);
  });
});
