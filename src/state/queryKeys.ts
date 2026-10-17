/** Query keys shared by hooks in state (architecture.md section 6.2). */
/**
 * Data that belongs to one aqueduct carries its id in the key, so a change of aqueduct can never
 * show the cached answer of another one (even before the cache is emptied).
 */
export function aqueductKey(aqueductId: string, ...parts: readonly string[]): readonly string[] {
  return ['aqueduct', aqueductId, ...parts];
}

export const queryKeys = {
  constraints: ['meta', 'constraints'] as const,
  /** The notice is the same for every aqueduct, so it has no aqueduct in its key. */
  privacyNotice: ['privacy', 'notice'] as const,
};
