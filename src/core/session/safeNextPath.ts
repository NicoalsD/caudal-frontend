const SCHEME_OR_NETWORK_PATH = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|\/\\)/;

/** Last ASCII control code (US) and DEL: neither may appear in a redirect target. */
const LAST_C0_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;
const BACKSLASH = '\\';

function hasUnsafeCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= LAST_C0_CONTROL_CODE || code === DELETE_CODE || character === BACKSLASH) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the path only when it is an internal route; otherwise null.
 * Prevents open redirects through the `?next=` parameter (architecture.md 4.2).
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  if (!raw.startsWith('/') || SCHEME_OR_NETWORK_PATH.test(raw) || hasUnsafeCharacter(raw)) {
    return null;
  }
  return raw;
}
