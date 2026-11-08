import type { JSX } from 'react';

import { lastDays, reportInstants, WEEK_DAYS } from '../../core/reports/reportPeriod';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useNarrativeReport } from '../../state/hooks/useReports';
import { usePermission } from '../../state/hooks/usePermission';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { cn } from '../../ui/styles/cn';
import styles from './BoardOverview.module.css';

const REPORT_PERMISSION = 'REPORT_VIEW';

/**
 * The week's narrative in a card: a button asks the assistant for it (never on load, because it
 * calls the language model) and the summary says whether the model or the rules wrote it.
 */
export function ReportCard(): JSX.Element | null {
  const allowed = usePermission(REPORT_PERMISSION);
  const today = useServiceToday();
  const narrative = useNarrativeReport();
  if (!allowed) {
    return null;
  }
  const days = lastDays(today, WEEK_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  return (
    <section className={cn(styles.card)} aria-labelledby="board-report-title">
      <h2 id="board-report-title" className={cn(styles.cardTitle)}>
        {t('board.report.title')}
      </h2>
      {narrative.isSuccess ? (
        <div className={cn(styles.stack)} role="status">
          <p className={cn(styles.strong)}>{narrative.data.title}</p>
          <p>{narrative.data.summary}</p>
          <p className={cn(styles.hint)}>
            {t('reports.sourceLine', {
              source: t(`assistant.source.${lower(narrative.data.source)}`),
            })}
          </p>
        </div>
      ) : (
        <p className={cn(styles.hint)}>{t('board.report.hint')}</p>
      )}
      {narrative.isError ? (
        <FormAlert message={t('board.report.error')} detail={errorText(narrative.error).message} />
      ) : null}
      <div className={cn(styles.actions)}>
        <Button
          disabled={narrative.isPending || period === null}
          onClick={() => {
            if (period !== null) {
              narrative.mutate(period);
            }
          }}
        >
          {narrative.isPending ? t('board.report.generating') : t('board.report.generate')}
        </Button>
        <LinkButton to={ROUTE_PATHS.board.reports}>{t('board.report.open')}</LinkButton>
      </div>
    </section>
  );
}
