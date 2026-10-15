import { HOURS_PER_DAY } from '../policy/clientPolicy';
import { gaugeDecimals } from '../rules/bandCoverage';
import type { Gauge } from '../rules/ruleSetParts';
import { FormSchemaBuilder, type DecimalRule } from './FormSchemaBuilder';
import type { ConstraintsMap } from './FieldConstraint';
import type { ValidationMessageFactory } from './validationMessages';

/** Field names shared with the API (snake_case in the JSON, as the constraints endpoint names them). */
export const FIELD = {
  readingNote: 'reading.note',
  note: 'note',
  waterAppearance: 'water_appearance_code',
  damageNoticed: 'damage_noticed',
  changeReason: 'change_reason',
  gaugeValue: 'gauge_value',
  correctedGaugeValue: 'corrected_gauge_value',
  username: 'username',
  password: 'password',
  currentPassword: 'current_password',
  newPassword: 'new_password',
  confirmPassword: 'confirm_password',
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

/**
 * The reading entry form of the plumber: gauge value (range from the active rule set), water
 * appearance (a catalog code), damage flag and an optional note. The note keeps the limits of the
 * `reading.note` constraint but the field is called `note`.
 */
export function readingEntrySchema(
  constraints: ConstraintsMap,
  gauge: DecimalRule,
  messages: ValidationMessageFactory,
) {
  return new FormSchemaBuilder(constraints, messages)
    .decimal(FIELD.gaugeValue, gauge)
    .requiredChoice(FIELD.waterAppearance)
    .flag(FIELD.damageNoticed)
    .text(FIELD.note, { constraint: FIELD.readingNote })
    .build();
}

/**
 * The key of the reason limits in /meta/constraints (API.md 4.1 and the backend's MetaController).
 * Corrections and discards read it; rule activation still reads `change_reason` (see the report).
 */
export const READING_REASON_CONSTRAINT = 'reason';

/** The gauge value alone, for correcting a refused reading: same range rules as the reading form. */
export function gaugeValueSchema(
  constraints: ConstraintsMap,
  gauge: DecimalRule,
  messages: ValidationMessageFactory,
) {
  return new FormSchemaBuilder(constraints, messages).decimal(FIELD.gaugeValue, gauge).build();
}

/** A correction of a saved reading: the new value in the range, and the mandatory reason. */
export function correctionFormSchema(
  constraints: ConstraintsMap,
  gauge: DecimalRule,
  messages: ValidationMessageFactory,
) {
  return new FormSchemaBuilder(constraints, messages)
    .decimal(FIELD.correctedGaugeValue, gauge)
    .requiredReason(FIELD.changeReason, { constraint: READING_REASON_CONSTRAINT })
    .build();
}

/** The mandatory reason of a reading (a correction or a discard): limits under `reason`. */
export function readingReasonSchema(
  constraints: ConstraintsMap,
  messages: ValidationMessageFactory,
) {
  return new FormSchemaBuilder(constraints, messages)
    .requiredReason(FIELD.changeReason, { constraint: READING_REASON_CONSTRAINT })
    .build();
}

/** Mandatory reason for a change (rule activation, proposal changes, corrections). */
export function reasonSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages).requiredReason(FIELD.changeReason).build();
}

/** Sign-in form: username (lower case) and password, with the limits of /meta/constraints. */
export function loginFormSchema(constraints: ConstraintsMap, messages: ValidationMessageFactory) {
  return new FormSchemaBuilder(constraints, messages)
    .text(FIELD.username, { lowercase: true })
    .password(FIELD.password)
    .build();
}

/** Names of the fields of the draft rules form. */
export const DRAFT_FIELD = { bands: 'bands', sectors: 'sectors', windows: 'windows' } as const;

/** Optional constraint whose `max` caps the operating windows of a version (API.md 6.5). */
export const WINDOWS_LIMIT_CONSTRAINT = 'rule_set.operating_windows';

/** What the draft form needs to know about the active tank (all from the rule set). */
export interface DraftFormContext {
  readonly gauge: Gauge;
}

/**
 * The editable parts of a rule set draft. The tank range and the decimals come from the rule set
 * itself; nothing about levels or hours is written here.
 */
export function draftRulesFormSchema(
  context: DraftFormContext,
  messages: ValidationMessageFactory,
  constraints: ConstraintsMap = {},
) {
  return new FormSchemaBuilder(constraints, messages)
    .bandList(DRAFT_FIELD.bands, {
      gauge: context.gauge,
      decimals: gaugeDecimals(context.gauge),
      maxHoursPerDay: HOURS_PER_DAY,
    })
    .sectorList(DRAFT_FIELD.sectors)
    .windowList(DRAFT_FIELD.windows, { limitField: WINDOWS_LIMIT_CONSTRAINT })
    .build();
}

/** The constraint that holds the password range (API.md 2.1 and 2.5). */
export const PASSWORD_CONSTRAINT = 'password';

/**
 * Change-password form. The current password only has to be present (it may predate today's
 * policy); the new one follows the server range, differs from the current one, does not contain
 * the username and is typed twice.
 */
export function changePasswordFormSchema(
  constraints: ConstraintsMap,
  messages: ValidationMessageFactory,
  username: string,
) {
  return new FormSchemaBuilder(constraints, messages)
    .password(FIELD.currentPassword, { constraint: PASSWORD_CONSTRAINT, anyLength: true })
    .password(FIELD.newPassword, { constraint: PASSWORD_CONSTRAINT })
    .password(FIELD.confirmPassword, { constraint: PASSWORD_CONSTRAINT })
    .differentFrom(FIELD.newPassword, FIELD.currentPassword)
    .notContaining(FIELD.newPassword, username)
    .confirmation(FIELD.confirmPassword, FIELD.newPassword)
    .build();
}
