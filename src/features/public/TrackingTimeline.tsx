import type { JSX } from 'react';
import { Check, Circle } from 'lucide-react';

import type { ReportStatus } from '../../core/incidents/reportStatus';
import { t } from '../../i18n/t';
import { ReportStatusBadge, STATUS_LABEL_KEY } from '../../ui/feedback/ReportStatusBadge';
import { cn } from '../../ui/styles/cn';
import styles from './PublicSchedule.module.css';

/** The road of a report; a dismissed one leaves it after the check. */
const STEPS_BY_STATUS: Readonly<Record<ReportStatus, readonly ReportStatus[]>> = {
  REPORTED: ['REPORTED', 'VERIFYING', 'CONFIRMED', 'RESOLVED'],
  VERIFYING: ['REPORTED', 'VERIFYING', 'CONFIRMED', 'RESOLVED'],
  CONFIRMED: ['REPORTED', 'VERIFYING', 'CONFIRMED', 'RESOLVED'],
  RESOLVED: ['REPORTED', 'VERIFYING', 'CONFIRMED', 'RESOLVED'],
  DISMISSED: ['REPORTED', 'VERIFYING', 'DISMISSED'],
};

interface TrackingTimelineProps {
  readonly status: ReportStatus;
}

/**
 * Where the report is on its road. Done steps carry a check and the word "Listo", the current one
 * is the status badge, and the next ones are hollow with the word "Pendiente": color never says it.
 */
export function TrackingTimeline({ status }: TrackingTimelineProps): JSX.Element {
  const steps = STEPS_BY_STATUS[status];
  const current = steps.indexOf(status);
  return (
    <ol className={cn(styles.timeline)}>
      {steps.map((step, index) => {
        const isCurrent = index === current;
        const isDone = index < current;
        return (
          <li
            key={step}
            className={cn(styles.timelineStep, isDone && styles.timelineDone)}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className={cn(styles.timelineDot)} aria-hidden="true">
              {isDone ? <Check /> : <Circle />}
            </span>
            {isCurrent ? (
              <ReportStatusBadge status={step} />
            ) : (
              <span className={cn(styles.timelineLabel)}>
                {t(STATUS_LABEL_KEY[step])}
                <span className={cn(styles.srOnly)}>
                  {` ${isDone ? t('publicTracking.stepDone') : t('publicTracking.stepPending')}`}
                </span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
