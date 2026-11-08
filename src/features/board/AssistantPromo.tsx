import { useState } from 'react';
import type { JSX } from 'react';
import { Send } from 'lucide-react';

import { QUESTION_MAX_LENGTH } from '../../core/autopilot/autopilotModel';
import { lastDays, reportInstants, WEEK_DAYS } from '../../core/reports/reportPeriod';
import { ROUTE_PATHS } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { LiveValve } from '../../core/scene/sceneModel';
import { useAskAssistant, useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useNarrativeReport } from '../../state/hooks/useReports';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { Card } from '../../ui/cards/Card';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { recommendationTitle } from './recommendationText';
import styles from './BoardPanel.module.css';

const REPORT_PERMISSION = 'REPORT_VIEW';
const TITLE_ID = 'board-promo-title';

/**
 * The dark promotional card: "Pregúntale a Caudal" with its question box, the newest pending
 * recommendation and the way to the report with AI. Each part shows only for who may use it.
 */
export function AssistantPromo({
  valves,
}: {
  readonly valves: readonly LiveValve[];
}): JSX.Element | null {
  const canAsk = usePermission(PERMISSION_ASSISTANT);
  const canReport = usePermission(REPORT_PERMISSION);
  if (!canAsk && !canReport) {
    return null;
  }
  return (
    <Card variant="dark" as="section" aria-labelledby={TITLE_ID} className={cn(styles.promo)}>
      <div className={cn(styles.promoBody)}>
        <h2 id={TITLE_ID} className={cn(styles.promoTitle)}>
          {t('assistant.askTitle')}
        </h2>
        {canAsk ? (
          <>
            <p className={cn(styles.promoText)}>{t('board.promo.text')}</p>
            <AskForm />
            <LastRecommendation valves={valves} />
          </>
        ) : null}
        {canReport ? <ReportAccess /> : null}
      </div>
    </Card>
  );
}

function AskForm(): JSX.Element {
  const ask = useAskAssistant();
  const [question, setQuestion] = useState('');
  const tooLong = question.length > QUESTION_MAX_LENGTH;
  return (
    <form
      noValidate
      className={cn(styles.ask)}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = question.trim();
        if (trimmed !== '' && !tooLong) {
          ask.mutate(trimmed);
        }
      }}
    >
      <label className={cn(styles.askLabel)} htmlFor="board-ask-input">
        {t('assistant.askLabel')}
      </label>
      <div className={cn(styles.askRow)}>
        <input
          id="board-ask-input"
          type="text"
          className={cn(styles.askInput)}
          value={question}
          autoComplete="off"
          aria-describedby="board-ask-hint"
          aria-invalid={tooLong ? true : undefined}
          placeholder={t('board.promo.questionHint')}
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
          }}
        />
        <Button
          type="submit"
          variant="onDark"
          disabled={ask.isPending || question.trim() === ''}
          className={cn(styles.askButton)}
        >
          <Send aria-hidden="true" />
          {ask.isPending ? t('assistant.asking') : t('assistant.askSubmit')}
        </Button>
      </div>
      <p id="board-ask-hint" className={cn(styles.promoHint)}>
        {tooLong
          ? t('assistant.tooLong')
          : `${t('assistant.askHint')} ${t('assistant.counter', {
              length: String(question.length),
              max: String(QUESTION_MAX_LENGTH),
            })}`}
      </p>
      {ask.isError ? (
        <FormAlert message={t('assistant.askError')} detail={errorText(ask.error).message} />
      ) : null}
      {ask.isSuccess ? (
        <div role="status" className={cn(styles.answer)}>
          <p>{ask.data.answer}</p>
          <p className={cn(styles.promoHint)}>
            {t('assistant.answerSource', {
              source: t(`assistant.source.${lower(ask.data.source)}`),
            })}
          </p>
        </div>
      ) : null}
    </form>
  );
}

function LastRecommendation({ valves }: { readonly valves: readonly LiveValve[] }): JSX.Element {
  const pending = useDecisions('PENDING');
  const latest = pending.data?.[0];
  return (
    <section className={cn(styles.last)} aria-labelledby="board-last-title">
      <h3 id="board-last-title" className={cn(styles.promoSub)}>
        {t('board.promo.lastTitle')}
      </h3>
      {latest === undefined ? (
        <p className={cn(styles.promoHint)}>{t('assistant.empty')}</p>
      ) : (
        <>
          <p className={cn(styles.lastTitle)}>{recommendationTitle(latest, valves)}</p>
          <p className={cn(styles.promoHint)}>{latest.reason}</p>
        </>
      )}
    </section>
  );
}

function ReportAccess(): JSX.Element {
  const today = useServiceToday();
  const narrative = useNarrativeReport();
  const days = lastDays(today, WEEK_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  return (
    <section className={cn(styles.last)} aria-labelledby="board-report-title">
      <h3 id="board-report-title" className={cn(styles.promoSub)}>
        {t('board.report.title')}
      </h3>
      {narrative.isSuccess ? (
        <div role="status" className={cn(styles.answer)}>
          <p className={cn(styles.lastTitle)}>{narrative.data.title}</p>
          <p>{narrative.data.summary}</p>
          <p className={cn(styles.promoHint)}>
            {t('reports.sourceLine', {
              source: t(`assistant.source.${lower(narrative.data.source)}`),
            })}
          </p>
        </div>
      ) : (
        <p className={cn(styles.promoHint)}>{t('board.report.hint')}</p>
      )}
      {narrative.isError ? (
        <FormAlert message={t('board.report.error')} detail={errorText(narrative.error).message} />
      ) : null}
      <div className={cn(styles.promoActions)}>
        <Button
          variant="onDark"
          disabled={narrative.isPending || period === null}
          onClick={() => {
            if (period !== null) {
              narrative.mutate(period);
            }
          }}
        >
          {narrative.isPending ? t('board.report.generating') : t('board.report.generate')}
        </Button>
        <LinkButton
          to={ROUTE_PATHS.board.reports}
          variant="onDark"
          className={cn(styles.promoLink)}
        >
          {t('board.report.open')}
        </LinkButton>
      </div>
    </section>
  );
}
