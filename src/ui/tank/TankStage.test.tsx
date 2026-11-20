import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { t } from '../../i18n/t';
import { TankStage } from './TankStage';

const BASE = {
  heading: 'Nivel del tanque',
  level: 2.5,
  gaugeMin: 0,
  gaugeMax: 5,
  bands: [
    { code: 'LOW', from: 0, to: 3 },
    { code: 'HIGH', from: 3, to: 5 },
  ],
  reserveLevel: 1,
} as const;

describe('TankStage', () => {
  it('says the level, how full the tank is and the approximate water', () => {
    render(<TankStage {...BASE} capacityLiters={20_000} />);

    expect(screen.getByRole('region', { name: BASE.heading })).toBeInTheDocument();
    expect(screen.getByText(t('tankStage.percent', { value: '50' }))).toBeInTheDocument();
    expect(screen.getByText(t('tankStage.volume'))).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: t('tankStatus.gaugeLabel', {
          level: '2,5',
          band: t('tankStatus.gaugeBandLow').toLowerCase(),
        }),
      }),
    ).toBeInTheDocument();
  });

  it('leaves the liters out when the tank has no capacity on record', () => {
    render(<TankStage {...BASE} capacityLiters={null} />);

    expect(screen.queryByText(t('tankStage.volume'))).not.toBeInTheDocument();
  });
});
