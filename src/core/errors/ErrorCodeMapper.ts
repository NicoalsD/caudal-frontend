const WORD_SEPARATOR = '_';

/** "GAUGE_OUT_OF_RANGE" becomes "gaugeOutOfRange": the key used in src/i18n/es.ts. */
export function codeToKey(code: string): string {
  const [first = '', ...rest] = code.toLowerCase().split(WORD_SEPARATOR);
  return first + rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

/** "gauge_min" becomes "gaugeMin": placeholder names in es.ts are camelCase. */
export function snakeToCamel(name: string): string {
  return codeToKey(name.toUpperCase());
}

/**
 * Turns an API error code into the key of its text, when the catalog knows it.
 * The catalog of keys is injected so core does not import the texts.
 */
export class ErrorCodeMapper {
  constructor(private readonly knownKeys: ReadonlySet<string>) {}

  /** The key for `code`, or null when there is no text for it (the caller uses `errors.generic`). */
  keyFor(code: string): string | null {
    const key = codeToKey(code);
    return this.knownKeys.has(key) ? key : null;
  }
}
