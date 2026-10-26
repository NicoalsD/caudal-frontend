import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useRunForecast } from '../../state/hooks/useTankStatus';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { forecastRunErrorMessage } from './forecastRunErrors';
import styles from './TankStatus.module.css';

/**
 * "Recalcular pronóstico" for the people with FORECAST_RUN. The AI may take a few seconds; the
 * new run, AI or simple estimate, replaces the one on screen with its own source notice.
 */
export function ForecastRunAction({ tankId }: { readonly tankId: string }): JSX.Element {
  const run = useRunForecast(tankId);
  return (
    <div className={cn(styles.runAction)}>
      <div className={cn(styles.actions)}>
        <Button variant="secondary" disabled={run.isPending} onClick={() => run.mutate()}>
          {run.isPending ? t('forecast.running') : t('forecast.run')}
        </Button>
      </div>
      {run.isPending ? <p className={cn(styles.muted)}>{t('forecast.runningHint')}</p> : null}
      {run.isSuccess ? (
        <p role="status">
          {run.data.isFallback ? t('forecast.runDoneEstimate') : t('forecast.runDoneAi')}
        </p>
      ) : null}
      {run.isError ? <FormAlert message={forecastRunErrorMessage(run.error)} /> : null}
    </div>
  );
}
