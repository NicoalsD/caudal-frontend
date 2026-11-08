import type { JSX } from 'react';

import { formatDayKeyLong } from '../../core/format/time';
import { t } from '../../i18n/t';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { TankStatusPage } from '../tank-status';
import { BoardDayGuide } from './BoardDayGuide';
import { ConsoleRail, ShiftsToday } from './BoardConsole';

/** The Board's console: today's date, the day guide, the tank, the rail and today's shifts. */
export function BoardDashboardPage(): JSX.Element {
  const today = useServiceToday();
  return (
    <TankStatusPage
      title={t('screens.boardToday', { date: formatDayKeyLong(today) })}
      guide={<BoardDayGuide />}
      console={{
        rail: (context) => <ConsoleRail {...context} />,
        after: () => <ShiftsToday />,
      }}
    />
  );
}
