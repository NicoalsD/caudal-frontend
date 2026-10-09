import { FormSchemaBuilder, type DecimalRule } from './FormSchemaBuilder';
import type { ConstraintsMap } from './FieldConstraint';
import type { ValidationMessageFactory } from './validationMessages';

/** Field names shared with the API (snake_case in the JSON, as the constraints endpoint names them). */
export const FIELD = {
  readingNote: 'reading.note',
  changeReason: 'change_reason',
  gaugeValue: 'gauge_value',
} as const;

/** Reading form: gauge value (range from the active rule set) and an optional note. */
export function readingFormSchema(
  constraints: ConstraintsMap,
  gauge: DecimalRule,
  messages: ValidationMessageFactory,
) {
  return new FormSchemaBuilder(constraints, messages)
    .decimal(FIELD.gaugeValue, gauge)
    .text(FIELD.readingNote)
    .build();
}

/** Mandatory reason for a change (rule activation, proposal changes, corrections). */
export function reasonSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages).requiredReason(FIELD.changeReason).build();
}
