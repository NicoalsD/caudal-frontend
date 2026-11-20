import { useCallback, useState } from 'react';

import {
  readChosenSector,
  writeChosenSector,
} from '../../services/preferences/chosenSectorPreference';

/**
 * The sector this phone remembers for an aqueduct, and a setter that remembers the new one. The
 * value is read once, when the screen opens; the setter writes it through the preferences service.
 */
export function useChosenSector(
  aqueductSlug: string,
): readonly [string | null, (sectorName: string | null) => void] {
  const [stored, setStored] = useState<string | null>(() => readChosenSector(aqueductSlug));
  const choose = useCallback(
    (sectorName: string | null): void => {
      setStored(sectorName);
      writeChosenSector(aqueductSlug, sectorName);
    },
    [aqueductSlug],
  );
  return [stored, choose];
}
