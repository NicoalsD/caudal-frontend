import { useState } from 'react';
import type { JSX } from 'react';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { IncidentTransitions } from '../../core/incidents/incidentTransitions';
import type { IncidentTarget } from '../../core/incidents/incidentTransitions';
import { dismissalNoteSchema } from '../../core/forms/formSchemas';
import type { IncidentView } from '../../services/api/views';
import { useConstraints } from '../../state/hooks/useConstraints';
import { useFormSchema } from '../../state/hooks/useFormSchema';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { ReportStatusBadge } from '../../ui/feedback/ReportStatusBadge';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { IncidentDismissForm } from './IncidentDismissForm';
import styles from './Incidents.module.css';
import { useChangeIncidentStatus } from './incidentQueries';

/** The words of each move. The dismissal reads "Descartar" wherever it appears. */
const ACTION_KEY = {
  VERIFYING: 'incidents.verify',
  CONFIRMED: 'incidents.confirm',
  RESOLVED: 'incidents.resolve',
  DISMISSED: 'incidents.dismiss',
} as const satisfies Readonly<Record<IncidentTarget, string>>;

const transitions = new IncidentTransitions();
const REASON_NOTE_FALLBACK = 0;

interface IncidentItemProps {
  readonly incident: IncidentView;
  readonly categoryLabel: string;
}

/**
 * One damage report on the Board screen. Each item has one main action (the next step) and
 * secondary ones: the details and, when allowed, the dismissal, which asks for its note first.
 */
export function IncidentItem({ incident, categoryLabel }: IncidentItemProps): JSX.Element {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const change = useChangeIncidentStatus();
  const constraints = useConstraints();
  const noteSchema = useFormSchema(dismissalNoteSchema);
  const primary = transitions.primaryFrom(incident.status);
  const canDismiss = transitions.canMove(incident.status, 'DISMISSED');
  const noteMax = constraints.data?.reason?.max ?? REASON_NOTE_FALLBACK;

  const move = (target: IncidentTarget, note?: string): void => {
    setFailure(null);
    change.mutate(
      note === undefined ? { id: incident.id, target } : { id: incident.id, target, note },
      {
        onSuccess: () => {
          setDismissing(false);
        },
        onError: (error) => {
          setFailure(errorText(error).message);
        },
      },
    );
  };

  return (
    <li className={cn(styles.item)}>
      <h2 className={cn(styles.category)}>{categoryLabel}</h2>
      <ReportStatusBadge status={incident.status} />
      <p>{t('incidents.receivedOn', { date: incident.reportedAt.text })}</p>
      <p>
        {incident.locationHint === null
          ? t('incidents.noPlace')
          : t('incidents.place', { place: incident.locationHint })}
      </p>
      {dismissing || primary === null ? null : (
        <Button variant="primary" disabled={change.isPending} onClick={() => move(primary)}>
          {t(ACTION_KEY[primary])}
        </Button>
      )}
      <div className={cn(styles.actions)}>
        <Button aria-expanded={detailsOpen} onClick={() => setDetailsOpen(!detailsOpen)}>
          {detailsOpen ? t('incidents.hideDetails') : t('incidents.details')}
        </Button>
        {canDismiss && !dismissing ? (
          <Button onClick={() => setDismissing(true)}>{t('incidents.dismiss')}</Button>
        ) : null}
      </div>
      {detailsOpen ? (
        <div className={cn(styles.details)}>
          <p>
            <strong>{t('incidents.description')}</strong>
          </p>
          <p>{incident.description}</p>
        </div>
      ) : null}
      {dismissing && noteSchema.status === 'ready' ? (
        <IncidentDismissForm
          schema={noteSchema.schema}
          noteMax={noteMax}
          isSaving={change.isPending}
          failure={failure}
          onConfirm={(note) => {
            move('DISMISSED', note);
          }}
          onCancel={() => {
            setDismissing(false);
          }}
        />
      ) : null}
      {failure === null || dismissing ? null : <FormAlert message={failure} />}
      <p role="status">{change.isSuccess && !change.isPending ? t('incidents.updated') : ''}</p>
    </li>
  );
}
