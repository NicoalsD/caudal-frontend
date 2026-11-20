import { useCallback, useState } from 'react';

import {
  readRememberedInstitution,
  rememberInstitution,
} from '../../services/preferences/rememberedInstitutionPreference';

/**
 * The institution this phone chose last, to preselect the first sign-in step, and a setter that
 * remembers a new one. Read once when the screen opens; the setter writes through the preferences
 * service. The setter is stable, so it can sit in an effect's dependencies.
 */
export function useRememberedInstitution(): readonly [string | null, (slug: string) => void] {
  const [stored, setStored] = useState<string | null>(readRememberedInstitution);
  const remember = useCallback((slug: string): void => {
    setStored(slug);
    rememberInstitution(slug);
  }, []);
  return [stored, remember];
}
