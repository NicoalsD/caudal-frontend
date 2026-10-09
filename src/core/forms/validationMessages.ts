/** Short keys of src/i18n/es.ts `validation.*`. core only knows the keys, never the texts. */
export type ValidationMessageKey =
  | 'required'
  | 'min'
  | 'max'
  | 'maxLines'
  | 'pattern'
  | 'rangeMin'
  | 'rangeMax'
  | 'decimalPlaces'
  | 'number';

export type ValidationParams = Readonly<Record<string, number>>;

/** Builds the message of a failed rule, with the limits that failed as parameters. */
export type ValidationMessageFactory = (
  key: ValidationMessageKey,
  params: ValidationParams,
) => string;

/** Messages that are just the key, for code that has no texts yet and for tests. */
export const keyMessages: ValidationMessageFactory = (key) => `validation.${key}`;
