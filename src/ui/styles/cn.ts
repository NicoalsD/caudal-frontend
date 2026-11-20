/**
 * Joins CSS Module class names, skipping missing ones.
 * With noUncheckedIndexedAccess every `styles.x` is `string | undefined`; this keeps JSX tidy.
 */
export function cn(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter((name): name is string => typeof name === 'string' && name !== '').join(' ');
}
