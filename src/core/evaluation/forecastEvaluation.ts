import { DISPLAY_LOCALE } from '../policy/clientPolicy';

/**
 * Answer of the evaluation for the whole screen (S23): does the AI help, given the horizons
 * evaluated so far? The server decides each horizon (`helps`); the client only combines them.
 */
export type AiVerdict = 'HELPS' | 'DOES_NOT_HELP' | 'UNKNOWN';

/** The part of a horizon's evaluation that the verdict needs. */
export interface HorizonAnswer {
  /** true or false when the server has enough evidence, null when it has not. */
  readonly helps: boolean | null;
}

/**
 * Says "helps" only when every horizon helps and "does not help" only when every horizon does
 * not. Any missing evidence or mixed answers keep the verdict unknown.
 */
export function aiVerdict(horizons: readonly HorizonAnswer[]): AiVerdict {
  if (horizons.length === 0 || horizons.some((horizon) => horizon.helps === null)) {
    return 'UNKNOWN';
  }
  if (horizons.every((horizon) => horizon.helps === true)) {
    return 'HELPS';
  }
  if (horizons.every((horizon) => horizon.helps === false)) {
    return 'DOES_NOT_HELP';
  }
  return 'UNKNOWN';
}

const PERCENT_SCALE = 100;

/** A ratio as a whole percentage text: 0.76 becomes "76 %" (decimal comma, as the rest of the UI). */
export function formatPercent(ratio: number, locale: string = DISPLAY_LOCALE): string {
  const rounded = Math.round(ratio * PERCENT_SCALE);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rounded)} %`;
}

/** The horizons to evaluate, 1 to `forecastHorizonDays` (from the active rules, never fixed here). */
export function horizonsUpTo(forecastHorizonDays: number): readonly number[] {
  return Array.from({ length: Math.max(0, forecastHorizonDays) }, (_, index) => index + 1);
}
