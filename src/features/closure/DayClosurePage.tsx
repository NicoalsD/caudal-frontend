import type { JSX } from 'react';
import { useParams } from 'react-router';

import { formatDayKey } from '../../core/format/time';
import { shiftExecutionFormSchema } from '../../core/forms/formSchemas';

import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSectors } from '../../state/hooks/useSectors';
import { useConnection } from '../../state/hooks/useConnection';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './DayClosure.module.css';
import { ShiftCard } from './ShiftCard';
import { useDayProposal } from './closureQueries';

/** YYYY-MM-DD, the service day in the route. */
const SERVICE_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** The reading limit of the execution note (API.md 11.1 uses the NOTE limits). */
const NOTE_CONSTRAINT = 'reading.note';

/** Screen S10: the shifts of the day, each registered as it went. Route /operador/cierre/:date. */
export function DayClosurePage(): JSX.Element {
  const { date = '' } = useParams();
  const constraints = useConstraints();
  const schema = useFormSchema(shiftExecutionFormSchema);
  const sectors = useSectors();
  const day = useDayProposal(date);
  const connection = useConnection();

  if (!SERVICE_DATE_KEY.test(date)) {
    return <ErrorState title={t('errors.notFoundTitle')} message={t('errors.notFoundBody')} />;
  }
  if (day.isPending || sectors.isPending || constraints.isPending || schema.status === 'loading') {
    return <LoadingState message={t('closure.loading')} />;
  }
  const title = t('closure.title', { date: formatDayKey(date) });
  if (day.isError || sectors.isError) {
    return (
      <ErrorState
        title={title}
        message={t('closure.errorBody')}
        action={
          <Button
            onClick={() => {
              void day.refetch();
              void sectors.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }
  const noteMax = constraints.data?.[NOTE_CONSTRAINT]?.max;
  if (schema.status !== 'ready' || noteMax === undefined) {
    return <ErrorState title={title} message={t('closure.unavailable')} />;
  }

  const items = [...(day.data?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  const sectorNames = new Map((sectors.data ?? []).map((sector) => [sector.id, sector.name]));
  const online = connection === 'ONLINE';

  return (
    <>
      <ScreenTitle>{title}</ScreenTitle>
      {items.length === 0 ? (
        <p>{t('closure.empty')}</p>
      ) : (
        <div className={cn(styles.stack)}>
          {items.map((item) => (
            <ShiftCard
              key={item.id}
              item={item}
              sectorName={sectorNames.get(item.sectorId) ?? t('closure.unknownSector')}
              serviceDate={date}
              schema={schema.schema}
              noteMax={noteMax}
              online={online}
            />
          ))}
        </div>
      )}
    </>
  );
}
