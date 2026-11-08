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

interface ReviewSlot {
  readonly extra: ReactNode;
  readonly extraHasItems: boolean;
}

/** What a slot of the Board console receives once the tank and its status are known. */
export interface ConsoleContext {
  readonly tank: TankView;
  readonly status: TankStatusView;
}

/** The Board's console: a rail of panels beside the tank, and more rows under it. */
export interface ConsoleSlots {
  /** Full width, above the rail and the tank (the KPI row). */
  readonly top?: (context: ConsoleContext) => ReactNode;
  /** Full width, under the console, one column on a phone (the overview grid). */
  readonly below?: (context: ConsoleContext) => ReactNode;
  readonly rail: (context: ConsoleContext) => ReactNode;
  readonly after: (context: ConsoleContext) => ReactNode;
}

interface TankStatusPageProps {
  readonly console?: ConsoleSlots;
  /** The h1. The Board passes today's date; everyone else keeps the screen name. */
  readonly title?: string;
  /** Shown right under the h1 (the Board's day guide). */
  readonly guide?: ReactNode;
  /** More to review next to the anomalies (the Board's open damage reports). */
  readonly reviewExtra?: ReactNode;
  readonly reviewExtraHasItems?: boolean;
}

/** The status of one tank, with its own loading and error states. */
function TankStatusSection({
  tank,
  review,
  console: consoleSlots,
}: {
  readonly tank: TankView;
  readonly review: ReviewSlot;
  readonly console: ConsoleSlots | undefined;
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
  if (consoleSlots !== undefined) {
    const context = { tank, status: status.data };
    return (
      <>
        {consoleSlots.top?.(context)}
        <div className={cn(styles.console)}>
          <aside className={cn(styles.rail)}>{consoleSlots.rail(context)}</aside>
          <div className={cn(styles.center)}>
            <TankOverview tank={tank} status={status.data} variant="console" />
            <AnomalyList hideWhenEmpty />
            {consoleSlots.after(context)}
          </div>
        </div>
        {consoleSlots.below?.(context)}
      </>
    );
  }
  return (
    <>
      <TankOverview tank={tank} status={status.data} />
      <AnomalyList extra={review.extra} extraHasItems={review.extraHasItems} />
    </>
  );
}

/** Screen S12 (status block): the active tank, or a picker when the aqueduct has several. */
export function TankStatusPage({
  console: consoleSlots,
  title,
  guide,
  reviewExtra,
  reviewExtraHasItems = false,
}: TankStatusPageProps = {}): JSX.Element {
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
          <TankStatusSection
            key={selected.id}
            tank={selected}
            review={{ extra: reviewExtra, extraHasItems: reviewExtraHasItems }}
            console={consoleSlots}
          />
        </>
      );
    }
  }

  return (
    <div className={cn(styles.stack, consoleSlots !== undefined && styles.stackConsole)}>
      <div className={cn(styles.head)}>
        <ScreenTitle>{title ?? t('screens.tankStatus')}</ScreenTitle>
        {guide}
      </div>
      {body}
    </div>
  );
}
