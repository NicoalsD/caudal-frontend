import { useId, useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import type { TankView } from '../../services/api/views';
import { useTankStatus } from '../../state/hooks/useTankStatus';
import { useTanks } from '../../state/hooks/useTanks';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { TankStatusCard } from './TankStatusCard';
import styles from './TankStatus.module.css';

/** The status of one tank, with its own loading and error states. */
function TankStatusSection({ tank }: { readonly tank: TankView }): JSX.Element {
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
  return <TankStatusCard tank={tank} status={status.data} />;
}

/** Screen S12 (status block): the active tank, or a picker when the aqueduct has several. */
export function TankStatusPage(): JSX.Element {
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
          <TankStatusSection key={selected.id} tank={selected} />
        </>
      );
    }
  }

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.tankStatus')}</ScreenTitle>
      {body}
    </div>
  );
}
