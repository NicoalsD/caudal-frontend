import { z } from 'zod';

import { HOURS_PER_DAY } from '../policy/clientPolicy';
import { gaugeDecimals } from '../rules/bandCoverage';
import type { Gauge } from '../rules/ruleSetParts';
import { FormSchemaBuilder, type DecimalRule } from './FormSchemaBuilder';
import type { ConstraintsMap } from './FieldConstraint';
import type { ValidationMessageFactory } from './validationMessages';

/** Field names shared with the API (snake_case in the JSON, as the constraints endpoint names them). */
export const FIELD = {
  readingNote: 'reading.note',
  changeReason: 'change_reason',
  gaugeValue: 'gauge_value',
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

/** Fields of the public damage report (API.md 15.4), named as the API sends them. */
export const DAMAGE_REPORT_FIELD = {
  categoryCode: 'category_code',
  description: 'description',
  locationHint: 'location_hint',
  website: 'website',
} as const;

/** Constraints that limit the report text (GET /meta/constraints). */
export const INCIDENT_DESCRIPTION_CONSTRAINT = 'incident.description';
export const INCIDENT_LOCATION_CONSTRAINT = 'incident.location_hint';

/**
 * Public damage report (S05). The category must be chosen; the description and the place follow
 * the limits of the server. The place is optional, so a missing limit only means it has no
 * maximum here: the server still rejects a place that is too long.
 */
export function damageReportFormSchema(
  constraints: ConstraintsMap,
  messages: ValidationMessageFactory,
) {
  const limits: ConstraintsMap =
    constraints[INCIDENT_LOCATION_CONSTRAINT] === undefined
      ? { ...constraints, [INCIDENT_LOCATION_CONSTRAINT]: { min: 0 } }
      : constraints;
  return new FormSchemaBuilder(limits, messages)
    .text(DAMAGE_REPORT_FIELD.description, { constraint: INCIDENT_DESCRIPTION_CONSTRAINT })
    .text(DAMAGE_REPORT_FIELD.locationHint, { constraint: INCIDENT_LOCATION_CONSTRAINT })
    .build()
    .extend({
      [DAMAGE_REPORT_FIELD.categoryCode]: z.string().min(1, { message: messages('required', {}) }),
      [DAMAGE_REPORT_FIELD.website]: z.string(),
    });
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
