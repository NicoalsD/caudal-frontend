/** The lowercase key of an uppercase code, typed so the catalog keys keep being checked. */
export function lower<Code extends string>(code: Code): Lowercase<Code> {
  return code.toLowerCase() as Lowercase<Code>;
}
