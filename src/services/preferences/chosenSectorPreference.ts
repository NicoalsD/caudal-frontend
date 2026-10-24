/*
 * Preferences kept on this phone (security.md 3.1). Only the name of the sector the person chose
 * is stored here: never data about a person, a token, a reading or the schedule itself.
 */

const STORAGE_PREFIX = 'caudal.public.sector';

function storageKey(aqueductSlug: string): string {
  return `${STORAGE_PREFIX}:${aqueductSlug}`;
}

/**
 * The sector this phone remembers for the aqueduct. Without storage (private window, blocked
 * site data) nothing is remembered and the screen simply asks again.
 */
export function readChosenSector(aqueductSlug: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(aqueductSlug));
  } catch {
    return null;
  }
}

export function writeChosenSector(aqueductSlug: string, sectorName: string | null): void {
  try {
    if (sectorName === null) {
      window.localStorage.removeItem(storageKey(aqueductSlug));
    } else {
      window.localStorage.setItem(storageKey(aqueductSlug), sectorName);
    }
  } catch {
    // Storage is not available: the choice lasts only for this visit.
  }
}
