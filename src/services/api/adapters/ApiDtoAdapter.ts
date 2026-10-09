import type { ConstraintsMap, FieldConstraint } from '../../../core/forms/FieldConstraint';
import { formatDecimal } from '../../../core/format/decimal';
import { formatDateTime, parseInstant, toBogotaDateKey } from '../../../core/format/time';
import { DEFAULT_DISPLAY_FRACTION_DIGITS } from '../../../core/policy/clientPolicy';
import type { components } from '../schema';
import type { DecimalView, HealthView, TimestampView } from '../views';
import { InvalidDtoError } from './InvalidDtoError';

type HealthDto = components['schemas']['HealthResponse'];
type ConstraintsDto = components['schemas']['ConstraintsResponse'];
type FieldConstraintDto = components['schemas']['FieldConstraint'];

/**
 * Adapter between the server contract and the view models (api-integration.md section 5).
 * It is the only place that knows DTO field names (snake_case); views are camelCase.
 *
 * - Fields not used by a view are not copied.
 * - Instants become a Date plus text in America/Bogota.
 * - JSON numbers (dot) become a number plus text with decimal comma.
 *
 * @pattern P06 Adapter
 */
export class ApiDtoAdapter {
  toHealth(dto: HealthDto): HealthView {
    return { isUp: dto.status === 'UP' };
  }

  /** `max_lines` becomes `maxLines`; only the limits that arrived are present. */
  toConstraints(dto: ConstraintsDto): ConstraintsMap {
    return Object.fromEntries(
      Object.entries(dto).map(([field, limits]) => [field, this.toFieldConstraint(limits)]),
    );
  }

  /** Converts an ISO-8601 instant from the API into a view with its Bogota text. */
  toTimestamp(field: string, iso: string): TimestampView {
    try {
      return { date: parseInstant(iso), text: formatDateTime(iso), dayKey: toBogotaDateKey(iso) };
    } catch (cause) {
      throw new InvalidDtoError(field, { cause });
    }
  }

  /** Converts a JSON number into a view with the decimal comma used on screen. */
  toDecimal(
    field: string,
    value: number,
    fractionDigits: number = DEFAULT_DISPLAY_FRACTION_DIGITS,
  ): DecimalView {
    if (!Number.isFinite(value)) {
      throw new InvalidDtoError(field);
    }
    return { value, text: formatDecimal(value, fractionDigits) };
  }

  private toFieldConstraint(dto: FieldConstraintDto): FieldConstraint {
    return {
      ...(dto.min === undefined ? {} : { min: dto.min }),
      ...(dto.max === undefined ? {} : { max: dto.max }),
      ...(dto.pattern === undefined ? {} : { pattern: dto.pattern }),
      ...(dto.max_lines === undefined ? {} : { maxLines: dto.max_lines }),
    };
  }
}
