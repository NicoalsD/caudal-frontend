import { formatDecimal } from './decimal';

type PlaceholderValue = string | number;

/** Names of the `{placeholders}` found in a template literal type. */
export type PlaceholderNames<T extends string> = T extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholderNames<Rest>
  : never;

export type MessageValues<T extends string> = [PlaceholderNames<T>] extends [never]
  ? never
  : Readonly<Record<PlaceholderNames<T>, PlaceholderValue>>;

/** Rest arguments: required exactly when the template has placeholders. */
export type MessageArguments<T extends string> = [PlaceholderNames<T>] extends [never]
  ? []
  : [values: MessageValues<T>];

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * Replaces `{name}` with the given value. Numbers are shown with decimal comma;
 * a missing value leaves the placeholder visible so the gap is noticed in review.
 */
export function interpolate(
  template: string,
  values: Readonly<Record<string, PlaceholderValue>> = {},
): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = values[name];
    if (value === undefined) {
      return placeholder;
    }
    return typeof value === 'number' ? formatDecimal(value) : value;
  });
}

interface Catalog {
  readonly [key: string]: string | Catalog;
}

/** Dotted keys of every text in a catalog: "reading.title". */
export type TextKey<T extends Catalog> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${TextKey<Extract<T[K], Catalog>>}`;
}[keyof T & string];

export type TextOf<T extends Catalog, K extends string> = K extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? TextOf<Extract<T[Head], Catalog>, Tail>
    : never
  : K extends keyof T
    ? T[K] extends string
      ? T[K]
      : never
    : never;

export type Translator<T extends Catalog> = <K extends TextKey<T>>(
  key: K,
  ...values: MessageArguments<TextOf<T, K>>
) => string;

/** Builds `t(key, values)` over a catalog of texts. Keys and placeholders are checked at compile time. */
export function createTranslator<T extends Catalog>(catalog: T): Translator<T> {
  return (key, ...values) => {
    const text = lookup(catalog, key);
    return interpolate(text, values[0]);
  };
}

function lookup(catalog: Catalog, key: string): string {
  let node: string | Catalog | undefined = catalog;
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node !== 'string') {
    throw new Error(`Missing text for key "${key}"`);
  }
  return node;
}
