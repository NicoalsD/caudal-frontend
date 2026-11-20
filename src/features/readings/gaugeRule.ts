import type { DecimalRule } from '../../core/forms/FormSchemaBuilder';
import { gaugeDecimals } from '../../core/rules/bandCoverage';
import type { Gauge } from '../../core/rules/ruleSetParts';
import type { TankView } from '../../services/api/views';

/** The decimal rule of the gauge: its range and how many decimals the ruler allows. */
export function gaugeDecimalRule(gauge: Gauge): DecimalRule {
  return { min: gauge.min, max: gauge.max, decimals: gaugeDecimals(gauge) };
}

/**
 * The gauge range that applies to a reading: the Junta's rule set (cached for offline use) wins;
 * the tank's own range is the fallback. Null only when neither is known yet.
 */
export function resolveGauge(
  ruleGauge: Gauge | undefined,
  tank: TankView | undefined,
): Gauge | null {
  if (ruleGauge !== undefined) {
    return ruleGauge;
  }
  return tank === undefined
    ? null
    : { min: tank.gaugeMin, max: tank.gaugeMax, step: tank.gaugeStep };
}
