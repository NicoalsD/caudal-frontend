import { useMemo } from 'react';

import { toBogotaDateKey } from '../../core/format/time';

/** Today's day of service (America/Bogota, YYYY-MM-DD). Read once per mounted screen. */
export function useServiceToday(): string {
  return useMemo(() => toBogotaDateKey(new Date().toISOString()), []);
}
