import { z } from 'zod';

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

export interface DecimalRule {
  readonly min: number;
  readonly max: number;
  /** Maximum number of decimals the person may type. */
  readonly decimals: number;
}

const LINE_BREAK = /\r\n|\r|\n/;
const MINIMUM_REQUIRED_LENGTH = 1;

export type FormShape = Record<string, z.ZodType>;

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

  constructor(
    private readonly constraints: ConstraintsMap,
    private readonly messages: ValidationMessageFactory,
  ) {}

  /** Text limited by the min, max, pattern and max lines the server sent for `field`. */
  text(field: string): this {
    this.shape[field] = this.textSchema(field, this.require(field).min ?? 0);
    return this;
  }

  /** Text that must not be empty, with the range the backend defines (for example a reason). */
  requiredReason(field: string): this {
    const minimum = Math.max(this.require(field).min ?? 0, MINIMUM_REQUIRED_LENGTH);
    this.shape[field] = this.textSchema(field, minimum);
    return this;
  }

  /**
   * A number typed by a person. Accepts "2,1" and "2.1"; the output is a JS number.
   * The range comes from the active rule set, not from constants.
   */
  decimal(field: string, rule: DecimalRule): this {
    this.shape[field] = z.string().transform((raw, context) => {
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
    return this;
  }

  build(): z.ZodObject<FormShape> {
    return z.object({ ...this.shape });
  }

  private textSchema(field: string, minimum: number): z.ZodType<string> {
    const limits = this.require(field);
    const pattern = this.compilePattern(field, limits);
    return z.string().transform((raw, context) => {
      const value = raw.trim();
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
