/**
 * Shape of a device public key (Ed25519): base64url without padding, 43 characters that decode to
 * 32 bytes (API.md 16.5). The meta constraints do not list it, so the shape lives here.
 */
export const PUBLIC_KEY_LENGTH = 43;
const PUBLIC_KEY_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${PUBLIC_KEY_LENGTH}}$`);

/** True when the text, without surrounding spaces, has the shape of a device public key. */
export function isValidPublicKey(value: string): boolean {
  return PUBLIC_KEY_PATTERN.test(value.trim());
}
