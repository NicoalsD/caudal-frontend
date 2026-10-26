import type { JSX } from 'react';

import { forecastSourceState } from '../../core/forecast/forecastSource';
import { t } from '../../i18n/t';
import type { ForecastView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import styles from './TankStatus.module.css';

/** Why the simple estimate replaced the AI model, in words (API.md 8.3). */
function fallbackReasonText(reason: string | null): string {
  switch (reason) {
    case 'IA_TIMEOUT':
      return t('forecast.reasonTimeout');
    case 'CIRCUIT_OPEN':
      return t('forecast.reasonCircuitOpen');
    case 'IA_ERROR':
      return t('forecast.reasonError');
    case 'INSUFFICIENT_HISTORY':
      return t('forecast.reasonInsufficientHistory');
    default:
      return t('forecast.reasonUnknown');
  }
}

/**
 * Says which source produced the numbers. The estimate has its own ochre notice and never passes
 * as the AI model's forecast.
 */
export function ForecastSourceNotice({
  forecast,
}: {
  readonly forecast: ForecastView;
}): JSX.Element {
  const { kind, accent } = forecastSourceState(forecast.isFallback).presentation;
  const meta = [
    forecast.modelName === null ? null : t('forecast.model', { name: forecast.modelName }),
    forecast.createdAt === null ? null : t('forecast.createdAt', { date: forecast.createdAt.text }),
  ].filter((part): part is string => part !== null);
  return (
    <div
      className={cn(styles.notice, accent === 'ochre' && styles.noticeEstimate)}
      role="note"
      data-source={kind}
    >
      <p>
        <strong>
          {kind === 'ESTIMATE' ? t('forecast.sourceEstimate') : t('forecast.sourceAi')}
        </strong>
      </p>
      <p>
        {kind === 'ESTIMATE'
          ? t('forecast.sourceEstimateText', {
              reason: fallbackReasonText(forecast.fallbackReason),
            })
          : t('forecast.sourceAiText')}
      </p>
      {meta.length > 0 ? <p className={cn(styles.muted)}>{meta.join(' · ')}</p> : null}
    </div>
  );
}
