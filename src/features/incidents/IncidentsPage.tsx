import type { JSX } from 'react';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useDamageCategories } from '../../state/hooks/useDamageCategories';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { IncidentItem } from './IncidentItem';
import styles from './Incidents.module.css';
import { useIncidents } from './incidentQueries';

/** Screen S21: damage reports and their status. The Board moves them forward, with a note. */
export function IncidentsPage(): JSX.Element {
  const incidents = useIncidents();
  const categories = useDamageCategories();

  if (incidents.isPending || categories.isPending) {
    return <LoadingState message={t('incidents.loading')} />;
  }
  if (incidents.isError || categories.isError) {
    const error = incidents.error ?? categories.error;
    return (
      <ErrorState
        title={t('screens.incidents')}
        message={errorText(error).message}
        action={
          <Button
            onClick={() => {
              void incidents.refetch();
              void categories.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const items = incidents.data.pages.flatMap((page) => page.items);
  const labelByCode = new Map((categories.data ?? []).map((option) => [option.code, option.label]));

  return (
    <>
      <ScreenTitle>{t('screens.incidents')}</ScreenTitle>
      {items.length === 0 ? (
        <p>{t('incidents.empty')}</p>
      ) : (
        <ul className={cn(styles.list)}>
          {items.map((incident) => (
            <IncidentItem
              key={incident.id}
              incident={incident}
              categoryLabel={labelByCode.get(incident.categoryCode) ?? incident.categoryCode}
            />
          ))}
        </ul>
      )}
      {incidents.hasNextPage ? (
        <Button
          disabled={incidents.isFetchingNextPage}
          onClick={() => {
            void incidents.fetchNextPage();
          }}
        >
          {t('incidents.loadMore')}
        </Button>
      ) : null}
    </>
  );
}
