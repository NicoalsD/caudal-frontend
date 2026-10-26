/**
 * The four epistemic sections of an acta (Caudal.md, section 5): what was observed, estimated,
 * inferred and confirmed. The order is the order of the page.
 */
export const EPISTEMIC_SECTIONS = ['observed', 'estimated', 'inferred', 'confirmed'] as const;
export type EpistemicSection = (typeof EPISTEMIC_SECTIONS)[number];

/** Why a period cannot be sent. The longest period (366 days) is checked by the server. */
export type PeriodError = 'PERIOD_REQUIRED' | 'PERIOD_REVERSED';

/**
 * Checks a period of service days (YYYY-MM-DD). Both days are needed and the end cannot be before
 * the start (API.md 13.1). Text dates in this format compare in calendar order.
 */
export function periodError(periodFrom: string, periodTo: string): PeriodError | null {
  if (periodFrom === '' || periodTo === '') {
    return 'PERIOD_REQUIRED';
  }
  if (periodTo < periodFrom) {
    return 'PERIOD_REVERSED';
  }
  return null;
}
