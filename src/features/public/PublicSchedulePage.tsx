import type { JSX } from 'react';
import { useParams } from 'react-router';

import { DomainError } from '../../core/errors/DomainError';
import { NetworkError } from '../../core/errors/NetworkError';
import { t } from '../../i18n/t';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { PublicScheduleContent } from './PublicScheduleContent';
import { usePublicSchedule } from './publicQueries';

const NOT_FOUND_CODE = 'NOT_FOUND';

/** Screen S04, first half: loading, the friendly "not found" and the retry. */
export function PublicSchedulePage(): JSX.Element {
  const { aqueductSlug = '' } = useParams();
  const schedule = usePublicSchedule(aqueductSlug);

  if (schedule.isPending) {
    return <LoadingState message={t('publicSchedule.loading')} />;
  }
  if (schedule.isError) {
    const error = schedule.error;
    if (error instanceof DomainError && error.code === NOT_FOUND_CODE) {
      return (
        <ErrorState
          title={t('publicSchedule.notFoundTitle')}
          message={t('publicSchedule.notFoundBody')}
        />
      );
    }
    return (
      <ErrorState
        title={t('publicSchedule.errorTitle')}
        message={
          error instanceof NetworkError
            ? t('publicSchedule.offline')
            : t('publicSchedule.errorBody')
        }
        action={<Button onClick={() => void schedule.refetch()}>{t('common.retry')}</Button>}
      />
    );
  }
  return <PublicScheduleContent schedule={schedule.data} />;
}
