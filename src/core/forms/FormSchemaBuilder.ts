import { z } from 'zod';

import { analyzeBands } from '../rules/bandCoverage';
import type { Gauge } from '../rules/ruleSetParts';
import { countFractionDigits, parseDecimalInput } from '../format/decimal';
import type { ConstraintsMap, FieldConstraint } from './FieldConstraint';
import type { ValidationMessageFactory } from './validationMessages';

/** The form needs a limit that the server did not send: a configuration error, not a user error. */
export class MissingConstraintError extends Error {
  readonly field: string;

  constructor(field: string) {
    super(`Missing constraint for field "${field}"`);
    this.name = 'MissingConstraintError';
    this.field = field;
  }
}

/** A pattern from the server is not a valid regular expression. */
export class InvalidConstraintError extends Error {
  readonly field: string;

  constructor(field: string, options?: ErrorOptions) {
    super(`Invalid pattern for field "${field}"`, options);
    this.name = 'InvalidConstraintError';
    this.field = field;
  }
}

export interface BandListRule {
  /** Range of the tank, from the rule set. */
  readonly gauge: Gauge;
  /** Decimals the levels and hours have (those of the gauge step). */
  readonly decimals: number;
  /** Most hours a band can give in a day (the hours of a day). */
  readonly maxHoursPerDay: number;
}

export interface DecimalRule {
  readonly min: number;
  readonly max: number;
  /** Maximum number of decimals the person may type. */
  readonly decimals: number;
}

export interface TextOptions {
  /** Normalizes to lower case before checking, for example the username (API.md 2.1). */
  readonly lowercase?: boolean;
}

export interface PasswordOptions {
  /** Constraint to read when it is not the field name, for example "password" for a confirmation. */
  readonly constraint?: string;
  /**
   * Skips the server minimum and only requires some text. Used for the current password, which
   * may predate today's policy; the server still decides.
   */
  readonly anyLength?: boolean;
}

const LINE_BREAK = /\r\n|\r|\n/;
const MINIMUM_REQUIRED_LENGTH = 1;

export type FormShape = Record<string, z.ZodType>;

/** A rule that compares fields of the same form, checked once every field is valid. */
interface CrossCheck {
  readonly field: string;
  readonly key: Parameters<ValidationMessageFactory>[0];
  readonly fails: (values: Readonly<Record<string, unknown>>) => boolean;
}

/**
 * Builds Zod schemas at run time from the limits of GET /meta/constraints and the rule set,
 * so forms never hold a hardcoded limit (configuration.md section 3). The rest of the app does
 * not know the shape of the constraints JSON, and decimal parsing with comma lives here only.
 *
 * Messages come from an injected factory: core knows the keys, the texts live in es.ts.
 *
 * @pattern P04 Builder
 */
export class FormSchemaBuilder {
  private readonly shape: FormShape = {};
  private readonly crossChecks: CrossCheck[] = [];

  constructor(
    private readonly constraints: ConstraintsMap,
    private readonly messages: ValidationMessageFactory,
  ) {}

  /** Text limited by the min, max, pattern and max lines the server sent for `field`. */
  text(field: string, options: TextOptions = {}): this {
    this.shape[field] = this.textSchema(field, this.require(field).min ?? 0, options);
    return this;
  }

  /**
   * A password: required, never trimmed or changed (spaces are valid characters), with the
   * length range of the server. Its value must not be echoed in any message.
   */
  password(field: string, options: PasswordOptions = {}): this {
    const limits = this.require(options.constraint ?? field);
    const minimum =
      options.anyLength === true
        ? MINIMUM_REQUIRED_LENGTH
        : Math.max(limits.min ?? 0, MINIMUM_REQUIRED_LENGTH);
    this.shape[field] = z.string().transform((value, context) => {
      const fail = (key: Parameters<ValidationMessageFactory>[0], params = {}): typeof z.NEVER => {
        context.addIssue({ code: 'custom', message: this.messages(key, params) });
        return z.NEVER;
      };
      if (value.length === 0) {
        return fail('required');
      }
      if (value.length < minimum) {
        return fail('min', { min: minimum });
      }
      if (limits.max !== undefined && value.length > limits.max) {
        return fail('max', { max: limits.max });
      }
      return value;
    });
    return this;
  }

  /** Text that must not be empty, with the range the backend defines (for example a reason). */
  requiredReason(field: string): this {
    const minimum = Math.max(this.require(field).min ?? 0, MINIMUM_REQUIRED_LENGTH);
    this.shape[field] = this.textSchema(field, minimum, {});
    return this;
  }

  /**
   * A number typed by a person. Accepts "2,1" and "2.1"; the output is a JS number.
   * The range comes from the active rule set, not from constants.
   */
  decimal(field: string, rule: DecimalRule): this {
    this.shape[field] = this.decimalSchema(rule);
    return this;
  }

  /**
   * The level bands of a rule set as typed in the editor: one row per band with its range and
   * hours (decimals with comma accepted), and the whole list checked against the tank range: every
   * band needs a top above its bottom, bands cannot overlap and together they must cover the gauge
   * without gaps (Reglas-de-negocio.md section 2). The range comes from the rule set, not from code.
   */
  bandList(field: string, rule: BandListRule): this {
    const levels: DecimalRule = {
      min: rule.gauge.min,
      max: rule.gauge.max,
      decimals: rule.decimals,
    };
    const hours: DecimalRule = { min: 0, max: rule.maxHoursPerDay, decimals: rule.decimals };
    const row = z.object({
      band: z.string(),
      min_level: this.decimalSchema(levels),
      max_level: this.decimalSchema(levels),
      daily_service_hours: this.decimalSchema(hours),
      priority_only: z.boolean(),
    });
    this.shape[field] = z.array(row).check((context) => {
      const rows = context.value;
      const analysis = analyzeBands(
        rows.map((value) => ({ minLevel: value.min_level, maxLevel: value.max_level })),
        rule.gauge,
        rule.decimals,
      );
      const report = (
        key: Parameters<ValidationMessageFactory>[0],
        params: Parameters<ValidationMessageFactory>[1],
        path: (string | number)[],
      ): void => {
        context.issues.push({
          code: 'custom',
          message: this.messages(key, params),
          path,
          input: rows,
        });
      };
      analysis.inverted.forEach((index) => {
        report('bandOrder', {}, [index, 'max_level']);
      });
      analysis.overlaps.forEach((span) => {
        report('bandOverlap', { from: span.from, to: span.to }, []);
      });
      analysis.gaps.forEach((span) => {
        report('bandGap', { from: span.from, to: span.to }, []);
      });
    });
    return this;
  }

  /** `field` must equal `of` (a password typed twice). The error is reported on `field`. */
  confirmation(field: string, of: string): this {
    this.crossChecks.push({
      field,
      key: 'mismatch',
      fails: (values) => values[field] !== values[of],
    });
    return this;
  }

  /** `field` must not contain `term` (the username), ignoring case. An empty term never fails. */
  notContaining(field: string, term: string): this {
    const needle = term.trim().toLowerCase();
    this.crossChecks.push({
      field,
      key: 'containsUsername',
      fails: (values) => needle !== '' && String(values[field]).toLowerCase().includes(needle),
    });
    return this;
  }

  /** `field` must differ from `from` (the new password against the current one). */
  differentFrom(field: string, from: string): this {
    this.crossChecks.push({
      field,
      key: 'sameAsCurrent',
      fails: (values) => values[field] === values[from],
    });
    return this;
  }

  /**
   * The sector settings of a rule set: one row per sector with its two flags. The position in the
   * list is the order of attention; the ranks are computed when the list is sent. A sector can
   * appear only once.
   */
  sectorList(field: string): this {
    const row = z.object({
      sector_id: z.string().min(1),
      is_included: z.boolean(),
      is_priority: z.boolean(),
    });
    this.shape[field] = z.array(row).check((context) => {
      const seen = new Set<string>();
      context.value.forEach((value, index) => {
        if (seen.has(value.sector_id)) {
          context.issues.push({
            code: 'custom',
            message: this.messages('duplicateSector', {}),
            path: [index, 'sector_id'],
            input: value,
          });
        }
        seen.add(value.sector_id);
      });
    });
    return this;
  }

  build(): z.ZodObject<FormShape> {
    const checks = [...this.crossChecks];
    const messages = this.messages;
    return z.object({ ...this.shape }).check((context) => {
      const values = context.value as Record<string, unknown>;
      for (const check of checks) {
        if (check.fails(values)) {
          context.issues.push({
            code: 'custom',
            message: messages(check.key, {}),
            path: [check.field],
            input: values,
          });
        }
      }
    });
  }

  private decimalSchema(rule: DecimalRule): z.ZodType<number> {
    return z.string().transform((raw, context) => {
      const value = parseDecimalInput(raw);
      if (value === null) {
        context.addIssue({ code: 'custom', message: this.messages('number', {}) });
        return z.NEVER;
      }
      if (countFractionDigits(raw) > rule.decimals) {
        context.addIssue({
          code: 'custom',
          message: this.messages('decimalPlaces', { max: rule.decimals }),
        });
        return z.NEVER;
      }
      if (value < rule.min) {
        context.addIssue({ code: 'custom', message: this.messages('rangeMin', { min: rule.min }) });
        return z.NEVER;
      }
      if (value > rule.max) {
        context.addIssue({ code: 'custom', message: this.messages('rangeMax', { max: rule.max }) });
        return z.NEVER;
      }
      return value;
    });
  }

  private textSchema(field: string, minimum: number, options: TextOptions): z.ZodType<string> {
    const limits = this.require(field);
    const pattern = this.compilePattern(field, limits);
    return z.string().transform((raw, context) => {
      const trimmed = raw.trim();
      const value = options.lowercase === true ? trimmed.toLowerCase() : trimmed;
      const fail = (key: Parameters<ValidationMessageFactory>[0], params = {}): typeof z.NEVER => {
        context.addIssue({ code: 'custom', message: this.messages(key, params) });
        return z.NEVER;
      };
      if (minimum > 0 && value.length === 0) {
        return fail('required');
      }
      if (value.length > 0 && value.length < minimum) {
        return fail('min', { min: minimum });
      }
      if (limits.max !== undefined && value.length > limits.max) {
        return fail('max', { max: limits.max });
      }
      if (limits.maxLines !== undefined && value.split(LINE_BREAK).length > limits.maxLines) {
        return fail('maxLines', { max: limits.maxLines });
      }
      if (pattern !== null && value.length > 0 && !pattern.test(value)) {
        return fail('pattern');
      }
      return value;
    });
  }

  private compilePattern(field: string, limits: FieldConstraint): RegExp | null {
    if (limits.pattern === undefined) {
      return null;
    }
    try {
      return new RegExp(limits.pattern, 'u');
    } catch (cause) {
      throw new InvalidConstraintError(field, { cause });
    }
  }

  private require(field: string): FieldConstraint {
    const limits = this.constraints[field];
    if (limits === undefined) {
      throw new MissingConstraintError(field);
    }
    return limits;
  }
}
