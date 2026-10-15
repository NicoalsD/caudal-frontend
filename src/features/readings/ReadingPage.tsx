import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useTanks } from '../../state/hooks/useTanks';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { QueryError } from '../../ui/feedback/QueryError';
import { ReadingForm } from './ReadingForm';
import { ReadingIssues } from './ReadingIssues';
import { SentReadings } from './SentReadings';
import styles from './Readings.module.css';

/** The plumber's screen: pick the tank (only when there is more than one) and register a level. */
export function ReadingPage(): JSX.Element {
  const tanks = useTanks();
  const [chosenId, setChosenId] = useState<string | null>(null);

  let body: JSX.Element;
  if (tanks.isPending) {
    body = <LoadingState message={t('readings.loading')} />;
  } else if (tanks.isError) {
    body = (
      <QueryError
        title={t('screens.newReading')}
        error={tanks.error}
        onRetry={() => void tanks.refetch()}
      />
    );
  } else {
    const active = tanks.data.filter((tank) => tank.isActive);
    const tank = active.find((item) => item.id === chosenId) ?? active[0];
    body =
      tank === undefined ? (
        <p>{t('readings.noTank')}</p>
      ) : (
        <>
          {active.length > 1 ? (
            <label>
              {t('readings.tankLabel')}{' '}
              <select
                className={cn(styles.select)}
                value={tank.id}
                onChange={(event) => {
                  setChosenId(event.target.value);
                }}
              >
                {active.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>{t('readings.tankLine', { name: tank.name })}</p>
          )}
          <ReadingForm key={tank.id} tank={tank} />
        </>
      );
  }
  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.newReading')}</ScreenTitle>
      {body}
      <ReadingIssues />
      <SentReadings />
    </div>
  );
}
