import { describe, expect, it } from 'vitest';

import { buildNetwork } from '../../core/network/buildNetwork';
import { t } from '../../i18n/t';
import type { LiveAqueduct } from '../../state/hooks/useLiveAqueduct';
import { toSceneFrame } from './sceneFrame';

const FRACTION = 0.46;
const LEVEL = 2.3;
const GAUGE_MAX = 5;

const aqueduct: LiveAqueduct = {
  tank: {
    id: 't',
    name: 'Tanque principal',
    gaugeMin: 0,
    gaugeMax: GAUGE_MAX,
    gaugeStep: 0.01,
    capacityLiters: null,
    isActive: true,
  },
  network: buildNetwork([], [], new Map()),
  level: LEVEL,
  levelFraction: FRACTION,
  status: null,
  rules: null,
  valves: [
    {
      id: 'v',
      code: 'V',
      name: 'Válvula alta',
      sectorId: 's',
      sectorName: 'Alto',
      isMotorized: true,
      isActive: true,
      state: 'CLOSED',
      command: { id: 'c', action: 'OPEN', status: 'PENDING' },
      flow: 0,
    },
  ],
  valvesAreLive: true,
};

describe('toSceneFrame', () => {
  it('writes the labels of the tank and of each valve in Spanish', () => {
    const frame = toSceneFrame(aqueduct);

    expect(frame.tankTitle).toBe('Tanque principal');
    expect(frame.tankDetail).toBe(t('scene.tankDetail', { level: '2,3', percent: '46' }));
    expect(frame.valves[0]).toMatchObject({
      title: 'Alto',
      command: 'PENDING',
      stateText: `${t('valves.state.closed')}, ${t('valves.command.pending')}`,
      flowText: t('scene.flowNone'),
    });
  });

  it('draws no rings until the rules arrive', () => {
    expect(toSceneFrame(aqueduct).rings).toEqual([]);
  });
});
