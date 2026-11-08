import { useState } from 'react';
import type { JSX } from 'react';

import { QUESTION_MAX_LENGTH } from '../../core/autopilot/autopilotModel';
import { formatDecimal } from '../../core/format/decimal';
import type { LiveValve } from '../../core/scene/sceneModel';
import { errorText } from '../../i18n/errorText';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { useAskAssistant, useDecisionActions, useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from './permissions';

const PERCENT = 100;
const WHOLE = 0;

interface AssistantPanelProps {
  readonly valves: readonly LiveValve[];
}

/**
 * The assistant: the pending recommendations with their reason and source, accept and reject, and
 * the "Pregúntale a Caudal" box. Every answer says whether the language model or the fallback
 * rules wrote it.
 */
export function AssistantPanel({ valves }: AssistantPanelProps): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  if (!allowed) {
    return null;
  }
  return (
    <section className={cn(styles.assistantBox)} aria-labelledby="assistant-title">
      <h3 id="assistant-title">{t('assistant.title')}</h3>
      <Recommendations valves={valves} />
      <AskBox />
    </section>
  );
}

function Recommendations({ valves }: AssistantPanelProps): JSX.Element {
  const pending = useDecisions('PENDING');
  const canAccept = usePermission(PERMISSION_VALVE_COMMAND);
  const { accept, reject } = useDecisionActions();

  if (pending.isPending) {
    return <LoadingState message={t('assistant.loading')} />;
  }
  if (pending.isError) {
    return <FormAlert message={t('assistant.error')} />;
  }
  if (pending.data.length === 0) {
    return <p>{t('assistant.empty')}</p>;
  }
  const failure = accept.isError
    ? t('assistant.acceptError')
    : reject.isError
      ? t('assistant.rejectError')
      : null;
  return (
    <>
      <ul className={cn(styles.recommendations)} aria-label={t('assistant.listLabel')}>
        {pending.data.map((decision) => (
          <li key={decision.id} className={cn(styles.recommendation)}>
            <RecommendationCard
              decision={decision}
              valves={valves}
              canAccept={canAccept}
              busy={accept.isPending || reject.isPending}
              onAccept={() => {
                accept.mutate(decision.id);
              }}
              onReject={() => {
                reject.mutate(decision.id);
              }}
            />
          </li>
        ))}
      </ul>
      {failure === null ? null : <FormAlert message={failure} />}
      {accept.isSuccess ? <p role="status">{t('assistant.accepted')}</p> : null}
      {reject.isSuccess ? <p role="status">{t('assistant.rejected')}</p> : null}
    </>
  );
}

function RecommendationCard({
  decision,
  valves,
  canAccept,
  busy,
  onAccept,
  onReject,
}: {
  readonly decision: AutopilotDecisionView;
  readonly valves: readonly LiveValve[];
  readonly canAccept: boolean;
  readonly busy: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
}): JSX.Element {
  const valve = valves.find((item) => item.id === decision.valveId);
  const action = t(`assistant.action.${lower(decision.action)}`);
  const title =
    valve === undefined
      ? t('assistant.recommendationNoValve', { action })
      : t('assistant.recommendation', { action, valve: valve.name });
  const movesValve = decision.action === 'OPEN' || decision.action === 'CLOSE';
  return (
    <>
      <span className={cn(styles.recommendationTitle)}>{title}</span>
      <span>{decision.reason}</span>
      <span className={cn(styles.meta)}>
        {t(`assistant.source.${lower(decision.source)}`)}
        {' · '}
        {t('assistant.confidence', {
          percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
        })}
      </span>
      <div className={cn(styles.actions)}>
        {movesValve && canAccept ? (
          <Button variant="primary" disabled={busy} onClick={onAccept}>
            {busy ? t('assistant.working') : t('assistant.accept')}
          </Button>
        ) : null}
        <Button disabled={busy} onClick={onReject}>
          {t('assistant.reject')}
        </Button>
      </div>
      {movesValve && !canAccept ? (
        <span className={cn(styles.meta)}>{t('assistant.cannotAccept')}</span>
      ) : null}
    </>
  );
}

function AskBox(): JSX.Element {
  const ask = useAskAssistant();
  const [question, setQuestion] = useState('');
  const tooLong = question.length > QUESTION_MAX_LENGTH;
  return (
    <form
      noValidate
      className={cn(styles.stack)}
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = question.trim();
        if (trimmed !== '' && !tooLong) {
          ask.mutate(trimmed);
        }
      }}
    >
      <TextAreaField
        label={t('assistant.askTitle')}
        hint={t('assistant.askHint')}
        error={tooLong ? t('assistant.tooLong') : undefined}
        length={question.length}
        maxLength={QUESTION_MAX_LENGTH}
        counterText={(length, max) =>
          t('assistant.counter', { length: String(length), max: String(max) })
        }
        rows={2}
        value={question}
        onChange={(event) => {
          setQuestion(event.currentTarget.value);
        }}
      />
      <div className={cn(styles.actions)}>
        <Button type="submit" disabled={ask.isPending || question.trim() === ''}>
          {ask.isPending ? t('assistant.asking') : t('assistant.askSubmit')}
        </Button>
      </div>
      {ask.isError ? (
        <FormAlert message={t('assistant.askError')} detail={errorText(ask.error).message} />
      ) : null}
      {ask.isSuccess ? (
        <div role="status">
          <p className={cn(styles.answer)}>{ask.data.answer}</p>
          <p className={cn(styles.meta)}>
            {t('assistant.answerSource', {
              source: t(`assistant.source.${lower(ask.data.source)}`),
            })}
          </p>
        </div>
      ) : null}
    </form>
  );
}
