/**
 * ICU writes "8:00 a. m." with no-break spaces. NFKC turns them into plain spaces,
 * so tests can compare readable strings.
 */
export const plain = (text: string): string => text.normalize('NFKC');
