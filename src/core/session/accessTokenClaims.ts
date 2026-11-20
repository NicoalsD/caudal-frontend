import { isRole } from './roles';
import type { Role } from './roles';

/** What the client reads from the access token to decide what to show. Never to authorize. */
export interface AccessTokenClaims {
  readonly subject: string;
  readonly role: Role;
  readonly aqueductId: string;
}

const JWT_PARTS = 3;
const PAYLOAD_INDEX = 1;
const BASE64_BLOCK = 4;

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / BASE64_BLOCK) * BASE64_BLOCK, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
  return new TextDecoder().decode(bytes);
}

/**
 * Reads `sub`, `role` and `aqueduct_id` from the payload of a JWT. The signature is NOT checked:
 * the server validates it on every call. Returns null when the token is not shaped as expected.
 */
export function readAccessTokenClaims(token: string): AccessTokenClaims | null {
  const parts = token.split('.');
  const payload = parts[PAYLOAD_INDEX];
  if (parts.length !== JWT_PARTS || payload === undefined) {
    return null;
  }
  try {
    const claims: unknown = JSON.parse(decodeBase64Url(payload));
    if (typeof claims !== 'object' || claims === null) {
      return null;
    }
    const { sub, role, aqueduct_id: aqueductId } = claims as Record<string, unknown>;
    if (typeof sub !== 'string' || !isRole(role) || typeof aqueductId !== 'string') {
      return null;
    }
    return { subject: sub, role, aqueductId };
  } catch {
    return null;
  }
}
