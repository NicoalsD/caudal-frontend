import { useId, useState } from 'react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import type { TankStatusView, TankView } from '../../services/api/views';
import { useTankStatus } from '../../state/hooks/useTankStatus';
import { useTanks } from '../../state/hooks/useTanks';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { AnomalyList } from './AnomalyList';
import { TankOverview } from './TankOverview';
import styles from './TankStatus.module.css';

/** What the Board's panel receives once the tank and its status are known. */
export interface ConsoleContext {
  readonly tank: TankView;
  readonly status: TankStatusView;
}

interface TankStatusPageProps {
  /** Draws the body once the tank and its status are known (the Board's panel); default: the tank screen. */
  readonly panel?: (context: ConsoleContext) => ReactNode;
  /** The h1. The Board passes today's date; everyone else keeps the screen name. */
  readonly title?: string;
  /** Shown right under the h1 (the Board's day guide). */
  readonly guide?: ReactNode;
}

/** The status of one tank, with its own loading and error states. */
function TankStatusSection({
  tank,
  panel,
}: {
  readonly tank: TankView;
  readonly panel: TankStatusPageProps['panel'];
}): JSX.Element {
  const status = useTankStatus(tank.id);
  if (status.isPending) {
    return <LoadingState message={t('tankStatus.loading')} />;
  }
  if (status.isError) {
    return (
      <QueryError
        title={t('screens.tankStatus')}
        error={status.error}
        onRetry={() => void status.refetch()}
      />
    );
  }
  if (panel !== undefined) {
    return <>{panel({ tank, status: status.data })}</>;
  }
  return (
    <>
      <TankOverview tank={tank} status={status.data} />
      <AnomalyList />
    </>
  );
}

/** Screen S12 (status block): the active tank, or a picker when the aqueduct has several. */
export function TankStatusPage({ panel, title, guide }: TankStatusPageProps = {}): JSX.Element {
  const tanks = useTanks();
  const pickerId = useId();
  const [pickedId, setPickedId] = useState<string | null>(null);

  let body: JSX.Element;
  if (tanks.isPending) {
    body = <LoadingState message={t('tankStatus.loading')} />;
  } else if (tanks.isError) {
    body = (
      <QueryError
        title={t('screens.tankStatus')}
        error={tanks.error}
        onRetry={() => void tanks.refetch()}
      />
    );
  } else {
    const active = tanks.data.filter((tank) => tank.isActive);
    const selected = active.find((tank) => tank.id === pickedId) ?? active[0];
    if (selected === undefined) {
      body = <p>{t('tankStatus.noTank')}</p>;
    } else {
      body = (
        <>
          {active.length > 1 ? (
            <div className={cn(styles.picker)}>
              <label htmlFor={pickerId}>{t('tankStatus.tankPicker')}</label>
              <select
                id={pickerId}
                value={selected.id}
                onChange={(event) => setPickedId(event.target.value)}
              >
                {active.map((tank) => (
                  <option key={tank.id} value={tank.id}>
                    {tank.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <TankStatusSection key={selected.id} tank={selected} panel={panel} />
        </>
      );
    }
  }

  return (
    <div className={cn(styles.stack)}>
      <div className={cn(styles.head)}>
        <ScreenTitle>{title ?? t('screens.tankStatus')}</ScreenTitle>
        {guide}
      </div>
      {body}
    </div>
  );
}
