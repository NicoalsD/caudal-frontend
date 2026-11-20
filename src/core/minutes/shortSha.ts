/** How many characters of the SHA-256 of a final PDF the screen shows (the copy has all 64). */
export const SHORT_SHA_LENGTH = 12;

const ELLIPSIS = '…';

/**
 * The start of a SHA-256 (hex, 64 characters) for reading on screen: enough to compare by eye, and
 * the copy button keeps the full value.
 */
export function shortSha(hash: string): string {
  return hash.length <= SHORT_SHA_LENGTH ? hash : `${hash.slice(0, SHORT_SHA_LENGTH)}${ELLIPSIS}`;
}
