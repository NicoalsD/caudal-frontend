import { useId, useState } from 'react';
import type { JSX } from 'react';
import { Bot, Check, Cpu, Send, X } from 'lucide-react';

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
import { Card } from '../../ui/cards/Card';
import { CardStack } from '../../ui/cards/CardStack';
import type { StackItem } from '../../ui/cards/CardStack';
import { Button } from '../../ui/primitives/Button';
import { Chip } from '../../ui/primitives/Chip';
import { isNearLimit } from '../../core/format/counter';
import { cn } from '../../ui/styles/cn';
import styles from './Aqueduct.module.css';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from './permissions';

const PERCENT = 100;
const WHOLE = 0;

interface AssistantPanelProps {
  readonly valves: readonly LiveValve[];
}

/**
 * The assistant: the pending recommendations as a fan of cards (reason, source, accept and
 * reject) and the dark "Pregúntale a Caudal" card. Every answer says whether the language model
 * or the fallback rules wrote it.
 */
export function AssistantPanel({ valves }: AssistantPanelProps): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  if (!allowed) {
    return null;
  }
  return (
    <>
      <section className={cn(styles.assistantBox)} aria-labelledby="assistant-title">
        <h3 id="assistant-title" className={cn(styles.sectionTitle)}>
          {t('assistant.title')}
        </h3>
        <Recommendations valves={valves} />
      </section>
      <AskCard />
    </>
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
    return (
      <Card variant="tinted" tint="mint" className={cn(styles.emptyCard)}>
        <Bot aria-hidden="true" />
        <p>{t('assistant.empty')}</p>
      </Card>
    );
  }
  const failure = accept.isError
    ? t('assistant.acceptError')
    : reject.isError
      ? t('assistant.rejectError')
      : null;
  const busy = accept.isPending || reject.isPending;
  const items: StackItem[] = pending.data.map((decision, position) => {
    const title = recommendationTitle(decision, valves);
    return {
      id: decision.id,
      label: t('assistant.cardLabel', { title }),
      content: (
        <RecommendationCard
          decision={decision}
          title={title}
          tint={TINTS[position % TINTS.length] ?? 'sand'}
          canAccept={canAccept}
          busy={busy}
          onAccept={() => {
            accept.mutate(decision.id);
          }}
          onReject={() => {
            reject.mutate(decision.id);
          }}
        />
      ),
    };
  });
  return (
    <>
      <CardStack label={t('assistant.listLabel')} items={items} />
      {failure === null ? null : <FormAlert message={failure} />}
      {accept.isSuccess ? <p role="status">{t('assistant.accepted')}</p> : null}
      {reject.isSuccess ? <p role="status">{t('assistant.rejected')}</p> : null}
    </>
  );
}

const TINTS = ['sand', 'cream', 'mint'] as const;

function recommendationTitle(
  decision: AutopilotDecisionView,
  valves: readonly LiveValve[],
): string {
  const valve = valves.find((item) => item.id === decision.valveId);
  const action = t(`assistant.action.${lower(decision.action)}`);
  return valve === undefined
    ? t('assistant.recommendationNoValve', { action })
    : t('assistant.recommendation', { action, valve: valve.name });
}

function RecommendationCard({
  decision,
  title,
  tint,
  canAccept,
  busy,
  onAccept,
  onReject,
}: {
  readonly decision: AutopilotDecisionView;
  readonly title: string;
  readonly tint: (typeof TINTS)[number];
  readonly canAccept: boolean;
  readonly busy: boolean;
  readonly onAccept: () => void;
  readonly onReject: () => void;
}): JSX.Element {
  const movesValve = decision.action === 'OPEN' || decision.action === 'CLOSE';
  const SourceIcon = decision.source === 'LLM' ? Bot : Cpu;
  return (
    <Card variant="tinted" tint={tint} className={cn(styles.recommendation)}>
      <div className={cn(styles.recommendationHead)}>
        <Chip icon={<SourceIcon aria-hidden="true" />}>
          {t(`assistant.source.${lower(decision.source)}`)}
        </Chip>
        <Chip>
          {t('assistant.confidence', {
            percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
          })}
        </Chip>
      </div>
      <p className={cn(styles.recommendationTitle)}>{title}</p>
      <p className={cn(styles.reason)}>{decision.reason}</p>
      <div className={cn(styles.actions)}>
        {movesValve && canAccept ? (
          <Button variant="primary" disabled={busy} onClick={onAccept}>
            <Check aria-hidden="true" />
            {busy ? t('assistant.working') : t('assistant.accept')}
          </Button>
        ) : null}
        <Button disabled={busy} onClick={onReject}>
          <X aria-hidden="true" />
          {t('assistant.reject')}
        </Button>
      </div>
      {movesValve && !canAccept ? (
        <p className={cn(styles.meta)}>{t('assistant.cannotAccept')}</p>
      ) : null}
    </Card>
  );
}

/** The dark promotional card where the person asks Caudal a question in plain words. */
function AskCard(): JSX.Element {
  const ask = useAskAssistant();
  const [question, setQuestion] = useState('');
  const id = useId();
  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const tooLong = question.length > QUESTION_MAX_LENGTH;
  return (
    <Card variant="dark" className={cn(styles.askCard)}>
      <h3 id={titleId} className={cn(styles.askTitle)}>
        {t('assistant.askTitle')}
      </h3>
      <p id={hintId} className={cn(styles.askText)}>
        {t('assistant.askPromo')} {t('assistant.askHint')}
      </p>
      <form
        noValidate
        className={cn(styles.askForm)}
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = question.trim();
          if (trimmed !== '' && !tooLong) {
            ask.mutate(trimmed);
          }
        }}
      >
        <textarea
          aria-labelledby={titleId}
          aria-describedby={tooLong ? `${hintId} ${errorId}` : hintId}
          aria-invalid={tooLong ? true : undefined}
          className={cn(styles.askField)}
          rows={2}
          value={question}
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
          }}
        />
        <p
          className={cn(
            styles.askCounter,
            isNearLimit(question.length, QUESTION_MAX_LENGTH) && styles.askNear,
          )}
        >
          {t('assistant.counter', {
            length: String(question.length),
            max: String(QUESTION_MAX_LENGTH),
          })}
        </p>
        {tooLong ? (
          <p id={errorId} role="alert" className={cn(styles.askNear)}>
            {t('assistant.tooLong')}
          </p>
        ) : null}
        <Button type="submit" variant="onDark" disabled={ask.isPending || question.trim() === ''}>
          <Send aria-hidden="true" />
          {ask.isPending ? t('assistant.asking') : t('assistant.askSubmit')}
        </Button>
      </form>
      {ask.isError ? (
        <FormAlert message={t('assistant.askError')} detail={errorText(ask.error).message} />
      ) : null}
      {ask.isSuccess ? (
        <div role="status" className={cn(styles.answerBox)}>
          <p className={cn(styles.answer)}>{ask.data.answer}</p>
          <p className={cn(styles.meta)}>
            {t('assistant.answerSource', {
              source: t(`assistant.source.${lower(ask.data.source)}`),
            })}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
