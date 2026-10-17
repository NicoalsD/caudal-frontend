import type { JSX } from 'react';
import { CircleCheck, TriangleAlert, Wifi, WifiOff } from 'lucide-react';

import { httpStatusOf } from '../../core/errors/httpInfo';
import { NetworkError } from '../../core/errors/NetworkError';
import { t } from '../../i18n/t';
import type { HealthComponentView } from '../../services/api/views';
import { useConnection } from '../../state/hooks/useConnection';
import { useSyncQueue } from '../../state/hooks/useSyncQueue';
import { Button } from '../../ui/primitives/Button';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './Health.module.css';
import { useSystemHealth } from './healthQueries';

/** The version of the app, from package.json (vite.config.ts). */
const APP_VERSION = __APP_VERSION__;

/** The status the actuator answers 503 with when the service is down (API.md 19.1). */
const SERVICE_UNAVAILABLE_STATUS = 503;

/**
 * Screen S24: the technical health of the service and of this device, read-only. The actuator is
 * outside /api/v1 and answers only UP or DOWN, so the components show only when the server sends
 * them. Connection and queue come from the app's own state.
 */
export function HealthPage(): JSX.Element {
  const health = useSystemHealth();
  const connection = useConnection();
  const queue = useSyncQueue();

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.health')}</ScreenTitle>
      {health.isPending ? <LoadingState message={t('health.loading')} /> : null}
      {health.isError && !isServiceDown(health.error) ? (
        <ErrorState
          title={t('screens.health')}
          message={
            health.error instanceof NetworkError && connection === 'OFFLINE'
              ? t('health.offlineNotice')
              : t('health.errorBody')
          }
          action={
            <Button onClick={() => void health.refetch()} disabled={health.isFetching}>
              {t('health.refresh')}
            </Button>
          }
        />
      ) : null}
      {health.isError && isServiceDown(health.error) ? (
        <ServiceStatus isUp={false} components={[]} />
      ) : null}
      {health.isSuccess ? (
        <ServiceStatus isUp={health.data.isUp} components={health.data.components} />
      ) : null}

      <section className={cn(styles.section)} aria-labelledby="health-device-title">
        <h2 id="health-device-title">{t('health.deviceTitle')}</h2>
        <ul className={cn(styles.list)}>
          <li className={cn(styles.item)}>
            <span>{t('health.connection')}</span>
            <span
              className={cn(
                styles.itemName,
                connection === 'ONLINE' ? styles.good : styles.warning,
              )}
            >
              {connection === 'ONLINE' ? (
                <Wifi aria-hidden="true" size={ICON_SIZE} />
              ) : (
                <WifiOff aria-hidden="true" size={ICON_SIZE} />
              )}{' '}
              {connection === 'ONLINE' ? t('health.online') : t('health.offline')}
            </span>
          </li>
          <li className={cn(styles.item)}>
            <span>{t('health.pendingTitle')}</span>
            <span className={cn(styles.itemName)}>
              {queue.pendingCount === 0
                ? t('health.nothingPending')
                : t('health.pending', { count: String(queue.pendingCount) })}
            </span>
          </li>
          {queue.needsReviewCount > 0 ? (
            <li className={cn(styles.item)}>
              <span>{t('health.reviewTitle')}</span>
              <span className={cn(styles.itemName, styles.warning)}>
                {t('health.needsReview', { count: String(queue.needsReviewCount) })}
              </span>
            </li>
          ) : null}
        </ul>
      </section>

      <section className={cn(styles.section)} aria-labelledby="health-app-title">
        <h2 id="health-app-title">{t('health.appTitle')}</h2>
        <p className={cn(styles.muted)}>{t('health.appVersion', { version: APP_VERSION })}</p>
      </section>

      <div className={cn(styles.actions)}>
        <Button onClick={() => void health.refetch()} disabled={health.isFetching}>
          {health.isFetching ? t('health.refreshing') : t('health.refresh')}
        </Button>
      </div>
    </div>
  );
}

const ICON_SIZE = 20;

function isServiceDown(error: unknown): boolean {
  return httpStatusOf(error) === SERVICE_UNAVAILABLE_STATUS;
}

function ServiceStatus({
  isUp,
  components,
}: {
  readonly isUp: boolean;
  readonly components: readonly HealthComponentView[];
}): JSX.Element {
  return (
    <section className={cn(styles.section)} aria-labelledby="health-service-title">
      <h2 id="health-service-title">{t('health.serviceTitle')}</h2>
      <p className={cn(styles.status, isUp ? styles.good : styles.warning)}>
        {isUp ? (
          <CircleCheck aria-hidden="true" size={ICON_SIZE} />
        ) : (
          <TriangleAlert aria-hidden="true" size={ICON_SIZE} />
        )}
        <span>{isUp ? t('health.serviceUp') : t('health.serviceDown')}</span>
      </p>
      {isUp ? null : <p className={cn(styles.muted)}>{t('health.serviceDownHint')}</p>}
      <h3>{t('health.componentsTitle')}</h3>
      {components.length === 0 ? (
        <p className={cn(styles.muted)}>{t('health.componentsNone')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {components.map((component) => (
            <li key={component.name} className={cn(styles.item)}>
              <span className={cn(styles.itemName)}>{componentName(component.name)}</span>
              <span className={cn(component.isUp ? styles.good : styles.warning)}>
                {component.isUp ? (
                  <CircleCheck aria-hidden="true" size={ICON_SIZE} />
                ) : (
                  <TriangleAlert aria-hidden="true" size={ICON_SIZE} />
                )}{' '}
                {component.isUp ? t('health.componentUp') : t('health.componentDown')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The name of a component in Spanish; a name the app does not know is shown as the server sent it. */
function componentName(name: string): string {
  switch (name) {
    case 'db':
      return t('health.component.db');
    case 'circuitBreaker':
      return t('health.component.circuitBreaker');
    case 'ia':
      return t('health.component.ia');
    default:
      return name;
  }
}
