import type { JSX } from 'react';

import { ROUTE_PATHS } from '../../core/session/routes';
import { formatDecimal } from '../../core/format/decimal';
import { toBogotaDateKey } from '../../core/format/time';
import { t } from '../../i18n/t';
import { useActiveTank, useTankStatus } from '../../state/hooks/useTankStatus';
import { useOfflineServices } from '../../state/hooks/offlineContext';
import { useSession } from '../../state/hooks/useSession';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { cn } from '../../ui/styles/cn';
import styles from './OperatorHome.module.css';

/** Hours shown without decimals: the age of a level is a rough figure for the plumber. */
const HOURS_DECIMALS = 0;

/**
 * Screen S07: who is signed in, the last level of the tank, and one main action (register a
 * reading). The day's closure is for today's date in America/Bogota.
 */
export function OperatorHomePage(): JSX.Element {
  const session = useSession();
  const offline = useOfflineServices();
  const summary = useSyncQueue();
  const active = useActiveTank();
  const name = session.status === 'authenticated' ? session.user.displayName : '';
  const today = toBogotaDateKey(new Date(offline.clock.nowMs()).toISOString());
  const pendingCount = summary.pendingCount + summary.needsReviewCount;

  let tankBlock: JSX.Element;
  if (active.status === 'loading') {
    tankBlock = <LoadingState message={t('tankStatus.loading')} />;
  } else if (active.status === 'error') {
    tankBlock = <p role="alert">{t('home.statusError')}</p>;
  } else if (active.status === 'empty') {
    tankBlock = <p>{t('tankStatus.noTank')}</p>;
  } else {
    tankBlock = <TankLevel tankId={active.tank.id} />;
  }

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.operatorHome')}</ScreenTitle>
      <p className={cn(styles.greeting)}>{t('home.greeting', { name })}</p>
      <section className={cn(styles.card)} aria-labelledby="home-tank-title">
        <h2 id="home-tank-title">{t('home.tankTitle')}</h2>
        {tankBlock}
      </section>
      <div className={cn(styles.primaryAction)}>
        <LinkButton variant="primary" to={ROUTE_PATHS.operator.newReading}>
          {t('home.newReading')}
        </LinkButton>
      </div>
      <nav aria-label={t('home.quickLinks')}>
        <ul className={cn(styles.links)}>
          <li>
            <LinkButton to={ROUTE_PATHS.operator.pending}>
              {t('home.pending', { count: String(pendingCount) })}
            </LinkButton>
          </li>
          <li>
            <LinkButton to={ROUTE_PATHS.operator.dayClosure.replace(':date', today)}>
              {t('home.dayClosure')}
            </LinkButton>
          </li>
          <li>
            <LinkButton to={ROUTE_PATHS.operator.damage}>{t('home.damage')}</LinkButton>
          </li>
        </ul>
      </nav>
    </div>
  );
}

const TREND_TEXT = {
  DOWN: 'tankStatus.trendDown',
  STABLE: 'tankStatus.trendStable',
  UP: 'tankStatus.trendUp',
} as const;

/** The last level, how old it is and where it goes. Reads the status of the tank (API.md 8.1). */
function TankLevel({ tankId }: { readonly tankId: string }): JSX.Element {
  const status = useTankStatus(tankId);
  if (status.isPending) {
    return <LoadingState message={t('tankStatus.loading')} />;
  }
  if (status.isError) {
    return (
      <div>
        <p role="alert">{t('home.statusError')}</p>
        <Button onClick={() => void status.refetch()}>{t('common.retry')}</Button>
      </div>
    );
  }
  const view = status.data;
  const level = view.level;
  return (
    <>
      {view.isDemo ? <SimulatedDataBanner /> : null}
      {level === null ? (
        <p>{t('tankStatus.noLevel')}</p>
      ) : (
        <>
          <p className={cn(styles.level)}>
            {t('home.levelValue', { value: formatDecimal(level.value.value) })}
          </p>
          <p>{t('home.levelAge', { hours: formatDecimal(level.hoursAgo, HOURS_DECIMALS) })}</p>
        </>
      )}
      {view.trend.label === null ? (
        <p>{view.trend.labelEs ?? ''}</p>
      ) : (
        <p>{t(TREND_TEXT[view.trend.label])}</p>
      )}
      {view.stale.isStale ? (
        <p className={cn(styles.stale)}>
          {t('home.stale', { hours: formatDecimal(view.stale.staleAfterHours, HOURS_DECIMALS) })}
        </p>
      ) : null}
    </>
  );
}
