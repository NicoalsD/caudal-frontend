import { interpolate } from '../core/format/message';
import type { ValidationMessageFactory } from '../core/forms/validationMessages';
import { strings } from './es';

/** Spanish texts for the validation keys; plugs into FormSchemaBuilder. */
export const validationMessages: ValidationMessageFactory = (key, params) =>
  interpolate(strings.validation[key], params);
