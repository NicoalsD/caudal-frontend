import { describe, expect, it } from 'vitest';

import { buildNetwork } from '../network/buildNetwork';
import { collectValves } from './attachments';

describe('collectValves', () => {
  it('lists the valves of every sector below the node', () => {
    const root = buildNetwork(
      [],
      [
        {
          id: 's-1',
          code: 'S1',
          name: 'Sector alto',
          parentSectorId: null,
          householdsCount: 4,
          isActive: true,
        },
        {
          id: 's-2',
          code: 'S2',
          name: 'Sector bajo',
          parentSectorId: 's-1',
          householdsCount: 2,
          isActive: true,
        },
      ],
      new Map([
        [
          's-1',
          [
            {
              id: 'v-1',
              code: 'V1',
              name: 'Válvula 1',
              locationHint: null,
              isMotorized: true,
              failSafePosition: 'CLOSED',
              isActive: true,
            },
          ],
        ],
        [
          's-2',
          [
            {
              id: 'v-2',
              code: 'V2',
              name: 'Válvula 2',
              locationHint: null,
              isMotorized: false,
              failSafePosition: 'KEEP',
              isActive: true,
            },
          ],
        ],
      ]),
    );

    expect(collectValves(root).map((valve) => valve.id)).toEqual(['v-1', 'v-2']);
  });
});
