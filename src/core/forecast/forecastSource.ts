/**
 * State pattern (P18): the source of a forecast decides how its numbers are drawn and labelled.
 * The AI model and the simple estimate that replaces it never look the same (API.md 8.3).
 */
export type ForecastSourceKind = 'AI' | 'ESTIMATE';

/** Visual role of a source: which token colors it and whether its line is dashed. */
export type ForecastAccent = 'water' | 'ochre';

export interface ForecastSourcePresentation {
  readonly kind: ForecastSourceKind;
  readonly accent: ForecastAccent;
  readonly lineDashed: boolean;
}

export abstract class ForecastSourceState {
  abstract readonly presentation: ForecastSourcePresentation;
}

export class AiForecastState extends ForecastSourceState {
  readonly presentation: ForecastSourcePresentation = {
    kind: 'AI',
    accent: 'water',
    lineDashed: false,
  };
}

/** The simple estimate: it replaced the AI model, so it is drawn in ochre with a dashed line. */
export class EstimateForecastState extends ForecastSourceState {
  readonly presentation: ForecastSourcePresentation = {
    kind: 'ESTIMATE',
    accent: 'ochre',
    lineDashed: true,
  };
}

/** The state for a run: `isFallback` is true only when the estimate replaced the AI model. */
export function forecastSourceState(isFallback: boolean): ForecastSourceState {
  return isFallback ? new EstimateForecastState() : new AiForecastState();
}
