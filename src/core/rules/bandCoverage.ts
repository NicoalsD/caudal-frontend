import type { Gauge } from './ruleSetParts';

/** Numbers of the band editor have this many decimals when the gauge step does not say otherwise. */
const MAX_STEP_DECIMALS = 6;
const DECIMAL_BASE = 10;

/** How many decimals the gauge works with: those of its step (0.01 gives 2). */
export function gaugeDecimals(gauge: Gauge): number {
  const [, fraction = ''] = gauge.step.toFixed(MAX_STEP_DECIMALS).replace(/0+$/, '').split('.');
  return Math.max(fraction.length, 0);
}

export interface Span {
  readonly from: number;
  readonly to: number;
}

export interface BandRange {
  readonly minLevel: number;
  readonly maxLevel: number;
}

export interface BandAnalysis {
  /** Positions (in the order received) of bands whose top is not above their bottom. */
  readonly inverted: readonly number[];
  /** Stretches of level covered by more than one band. */
  readonly overlaps: readonly Span[];
  /** Stretches of the gauge range that no band covers. */
  readonly gaps: readonly Span[];
}

/**
 * Checks bands against the tank range. Bands are [min, max): the bottom is included, the top is
 * not, except the highest band, which also includes the gauge maximum (Reglas-de-negocio 2.1).
 * Levels are compared as whole numbers of the gauge's smallest unit, so 3.5 and 3.50 are equal and
 * floating point never invents a gap.
 */
export function analyzeBands(
  bands: readonly BandRange[],
  gauge: Gauge,
  decimals: number = gaugeDecimals(gauge),
): BandAnalysis {
  const scale = DECIMAL_BASE ** decimals;
  const units = (value: number): number => Math.round(value * scale);
  const fromUnits = (value: number): number => value / scale;

  const inverted: number[] = [];
  const valid: { from: number; to: number }[] = [];
  bands.forEach((band, index) => {
    const from = units(band.minLevel);
    const to = units(band.maxLevel);
    if (to <= from) {
      inverted.push(index);
    } else {
      valid.push({ from, to });
    }
  });
  valid.sort((a, b) => a.from - b.from);

  const overlaps: Span[] = [];
  const gaps: Span[] = [];
  let covered = units(gauge.min);
  for (const band of valid) {
    if (band.from > covered) {
      gaps.push({ from: fromUnits(covered), to: fromUnits(Math.min(band.from, units(gauge.max))) });
    } else if (band.from < covered) {
      overlaps.push({ from: fromUnits(band.from), to: fromUnits(Math.min(covered, band.to)) });
    }
    covered = Math.max(covered, band.to);
  }
  if (covered < units(gauge.max)) {
    gaps.push({ from: fromUnits(covered), to: gauge.max });
  }
  return {
    inverted,
    overlaps,
    gaps: gaps.filter((gap) => gap.from < gap.to),
  };
}

export function isBandSetValid(analysis: BandAnalysis): boolean {
  return (
    analysis.inverted.length === 0 && analysis.overlaps.length === 0 && analysis.gaps.length === 0
  );
}
