import { COUNTER_WARNING_FRACTION } from '../policy/clientPolicy';

/** True when `length` has used the warning fraction (90 %) of `maxLength` or more. */
export function isNearLimit(length: number, maxLength: number): boolean {
  return maxLength > 0 && length >= maxLength * COUNTER_WARNING_FRACTION;
}
