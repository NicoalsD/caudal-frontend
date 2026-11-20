/*
 * Preference kept on this phone (security.md 3.1): only the slug of the institution the person
 * chose last, to preselect the first step of the sign in. A slug is public. Never a token, a
 * password or a username.
 */

export const REMEMBERED_INSTITUTION_KEY = 'caudal.login.institution';

/** The slug chosen last time, or null when none is kept or storage is not available. */
export function readRememberedInstitution(): string | null {
  try {
    return window.localStorage.getItem(REMEMBERED_INSTITUTION_KEY);
  } catch {
    // Private windows and blocked storage: the convenience is simply absent.
    return null;
  }
}

export function rememberInstitution(slug: string): void {
  try {
    window.localStorage.setItem(REMEMBERED_INSTITUTION_KEY, slug);
  } catch {
    // Without storage the next visit starts on the first step, which is fine.
  }
}
