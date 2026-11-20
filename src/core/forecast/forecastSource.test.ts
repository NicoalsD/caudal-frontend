import { describe, expect, it } from 'vitest';

import { AiForecastState, EstimateForecastState, forecastSourceState } from './forecastSource';

describe('forecastSourceState (P18)', () => {
  it('draws the AI model in water with a solid line', () => {
    const state = forecastSourceState(false);

    expect(state).toBeInstanceOf(AiForecastState);
    expect(state.presentation).toEqual({ kind: 'AI', accent: 'water', lineDashed: false });
  });

  it('draws the simple estimate in ochre with a dashed line', () => {
    const state = forecastSourceState(true);

    expect(state).toBeInstanceOf(EstimateForecastState);
    expect(state.presentation).toEqual({ kind: 'ESTIMATE', accent: 'ochre', lineDashed: true });
  });

  it('never gives the two sources the same presentation', () => {
    expect(forecastSourceState(true).presentation).not.toEqual(
      forecastSourceState(false).presentation,
    );
  });
});
