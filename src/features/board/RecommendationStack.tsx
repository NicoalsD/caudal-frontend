import type { JSX } from 'react';
import { Bot, Check, X } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { useDecisionActions, useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { Card } from '../../ui/cards/Card';
import type { Tint } from '../../ui/cards/Card';
import { CardStack } from '../../ui/cards/CardStack';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from '../aqueduct/permissions';
import { recommendationTitle } from './recommendationText';
import styles from './BoardPanel.module.css';

const PERCENT = 100;
const WHOLE = 0;
const TITLE_ID = 'board-stack-title';

const ACTION_TINT: Readonly<Record<AutopilotDecisionView['action'], Tint>> = {
  OPEN: 'mint',
  CLOSE: 'aqua',
  WAIT: 'cream',
  INSPECT: 'sand',
};

/**
 * The pending recommendations of the pilot as cards fanned one behind another: the front one can
 * be accepted or rejected, the others peek out. Without ASSISTANT_USE the section is left out.
 */
export function RecommendationStack({
  valves,
}: {
  readonly valves: readonly LiveValve[];
}): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const canAccept = usePermission(PERMISSION_VALVE_COMMAND);
  const pending = useDecisions('PENDING', allowed);
  const { accept, reject } = useDecisionActions();
  if (!allowed) {
    return null;
  }
  const busy = accept.isPending || reject.isPending;
  let body: JSX.Element;
  if (pending.isPending) {
    body = <LoadingState message={t('assistant.loading')} />;
  } else if (pending.isError) {
    body = <FormAlert message={t('assistant.error')} />;
  } else if (pending.data.length === 0) {
    body = (
      <Card variant="tinted" tint="mint" className={cn(styles.stackEmpty)}>
        <Bot aria-hidden="true" />
        <p>{t('board.stack.empty')}</p>
      </Card>
    );
  } else {
    const failure = accept.isError
      ? t('assistant.acceptError')
      : reject.isError
        ? t('assistant.rejectError')
        : null;
    body = (
      <>
        <CardStack
          label={t('assistant.listLabel')}
          items={pending.data.map((decision) => {
            const title = recommendationTitle(decision, valves);
            const movesValve = decision.action === 'OPEN' || decision.action === 'CLOSE';
            return {
              id: decision.id,
              label: title,
              content: (
                <Card
                  variant="tinted"
                  tint={ACTION_TINT[decision.action]}
                  className={cn(styles.recommendation)}
                >
                  <p className={cn(styles.recommendationTitle)}>{title}</p>
                  <p>{decision.reason}</p>
                  <p className={cn(styles.sub)}>
                    {t(`assistant.source.${lower(decision.source)}`)}
                    {' · '}
                    {t('assistant.confidence', {
                      percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
                    })}
                  </p>
                  <div className={cn(styles.recommendationActions)}>
                    {movesValve && canAccept ? (
                      <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() => {
                          accept.mutate(decision.id);
                        }}
                      >
                        <Check aria-hidden="true" />
                        {busy ? t('assistant.working') : t('assistant.accept')}
                      </Button>
                    ) : null}
                    <Button
                      disabled={busy}
                      onClick={() => {
                        reject.mutate(decision.id);
                      }}
                    >
                      <X aria-hidden="true" />
                      {t('assistant.reject')}
                    </Button>
                  </div>
                  {movesValve && !canAccept ? (
                    <p className={cn(styles.sub)}>{t('assistant.cannotAccept')}</p>
                  ) : null}
                </Card>
              ),
            };
          })}
        />
        {failure === null ? null : <FormAlert message={failure} />}
        {accept.isSuccess ? <p role="status">{t('assistant.accepted')}</p> : null}
        {reject.isSuccess ? <p role="status">{t('assistant.rejected')}</p> : null}
      </>
    );
  }
  return (
    <section className={cn(styles.stackSection)} aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className={cn(styles.sectionTitle)}>
        {t('board.stack.title')}
      </h2>
      {body}
    </section>
  );
}
