import type { JSX } from 'react';

import { formatDayKeyLong } from '../../core/format/time';
import { t } from '../../i18n/t';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { TankStatusPage } from '../tank-status';
import { BoardPanel } from './BoardPanel';

/** The Board's panel: today's date as the title and, under it, the panorama of the aqueduct. */
export function BoardDashboardPage(): JSX.Element {
  const today = useServiceToday();
  return (
    <TankStatusPage
      title={t('screens.boardToday', { date: formatDayKeyLong(today) })}
      panel={(context) => <BoardPanel {...context} />}
    />
  );
}
