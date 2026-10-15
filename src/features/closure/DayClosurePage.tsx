import type { JSX } from 'react';
import { useParams } from 'react-router';

import { formatDayKey } from '../../core/format/time';
import { closureNotesSchema, shiftExecutionFormSchema } from '../../core/forms/formSchemas';
import { t } from '../../i18n/t';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useConnection } from '../../state/hooks/useConnection';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { useSectors } from '../../state/hooks/useSectors';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { ClosedDayView } from './ClosedDayView';
import { CloseDayPanel } from './CloseDayPanel';
import styles from './DayClosure.module.css';
import { ShiftCard } from './ShiftCard';
import { useDayClosure, useDayProposal } from './closureQueries';

/** YYYY-MM-DD, the service day in the route. */
const SERVICE_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** The reading limit of the notes (API.md 11.1 and 11.3 use the NOTE limits). */
const NOTE_CONSTRAINT = 'reading.note';

/**
 * Screen S10: the shifts of the day, each registered as it went, and the closure of the day.
 * Route /operador/cierre/:date. Once the day is closed it shows the same day read-only.
 */
export function DayClosurePage(): JSX.Element {
  const { date = '' } = useParams();
  const constraints = useConstraints();
  const shiftSchema = useFormSchema(shiftExecutionFormSchema);
  const notesSchema = useFormSchema(closureNotesSchema);
  const sectors = useSectors();
  const day = useDayProposal(date);
  const closure = useDayClosure(date);
  const connection = useConnection();

  if (!SERVICE_DATE_KEY.test(date)) {
    return <ErrorState title={t('errors.notFoundTitle')} message={t('errors.notFoundBody')} />;
  }
  const title = t('closure.title', { date: formatDayKey(date) });
  if (
    day.isPending ||
    closure.isPending ||
    sectors.isPending ||
    constraints.isPending ||
    shiftSchema.status === 'loading' ||
    notesSchema.status === 'loading'
  ) {
    return <LoadingState message={t('closure.loading')} />;
  }
  if (day.isError || closure.isError || sectors.isError) {
    return (
      <ErrorState
        title={title}
        message={t('closure.errorBody')}
        action={
          <Button
            onClick={() => {
              void day.refetch();
              void closure.refetch();
              void sectors.refetch();
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const items = [...(day.data?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  const sectorNames = new Map((sectors.data ?? []).map((sector) => [sector.id, sector.name]));
  if (closure.data !== null && closure.data !== undefined) {
    return <ClosedDayView closure={closure.data} items={items} sectorNames={sectorNames} />;
  }

  const noteMax = constraints.data?.[NOTE_CONSTRAINT]?.max;
  if (shiftSchema.status !== 'ready' || notesSchema.status !== 'ready' || noteMax === undefined) {
    return <ErrorState title={title} message={t('closure.unavailable')} />;
  }
  if (day.data === null) {
    return (
      <>
        <ScreenTitle>{title}</ScreenTitle>
        <p>{t('closure.empty')}</p>
      </>
    );
  }

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
              schema={shiftSchema.schema}
              noteMax={noteMax}
              online={online}
            />
          ))}
        </div>
      )}
      <CloseDayPanel
        serviceDate={date}
        schema={notesSchema.schema}
        noteMax={noteMax}
        shiftCount={items.length}
        online={online}
        onAlreadyClosed={() => {
          void closure.refetch();
        }}
      />
    </>
  );
}
