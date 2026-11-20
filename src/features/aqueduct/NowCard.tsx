import { useState } from 'react';
import type { JSX } from 'react';
import { Bot, Check, ChevronLeft, ChevronRight, Cpu, MapPin, X } from 'lucide-react';

import type { RegionView } from '../../core/console/regions';
import { regionOfValve } from '../../core/console/regions';
import { formatDecimal } from '../../core/format/decimal';
import type { LiveValve } from '../../core/scene/sceneModel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import type { AutopilotDecisionView } from '../../services/api/views';
import { useDecisionActions, useDecisions } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { AutopilotModeControl } from './AutopilotModeControl';
import { PERMISSION_ASSISTANT, PERMISSION_VALVE_COMMAND } from './permissions';
import { recommendationTitle } from './recommendationText';
import styles from './NowCard.module.css';

const noop = (): void => undefined;
const PERCENT = 100;
const WHOLE = 0;
const TITLE_ID = 'now-card-title';

interface NowCardProps {
  readonly valves: readonly LiveValve[];
  readonly regions: readonly RegionView[];
  /** Lights the valve the recommendation is about while the person looks at it. */
  readonly onFocusValve?: (valveId: string | null) => void;
}

/**
 * What there is to decide now, first on the screen: the pilot's recommendation as a plain
 * sentence with its reason, Accept and Reject, and one quiet line with its region, source and
 * confidence. Without a recommendation it says so in one line. The pilot's mode closes the card.
 * Pointing at the card lights the valve in the 3D scene.
 */
export function NowCard({ valves, regions, onFocusValve = noop }: NowCardProps): JSX.Element {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const pending = useDecisions('PENDING', allowed);
  const [index, setIndex] = useState(0);
  const items = pending.data ?? [];
  const position = Math.min(index, Math.max(0, items.length - 1));
  const decision = items[position] ?? null;
  const light = (): void => {
    onFocusValve(decision?.valveId ?? null);
  };
  const dim = (): void => {
    onFocusValve(null);
  };

  let body: JSX.Element;
  if (!allowed) {
    body = <Quiet title={t('console.noAssistant')} text={t('console.noAssistantBody')} />;
  } else if (pending.isPending) {
    body = <Quiet title={t('console.bandLabel')} text={t('console.recommendationLoading')} />;
  } else if (pending.isError) {
    body = <Quiet title={t('console.bandLabel')} text={t('console.recommendationError')} alert />;
  } else if (decision === null) {
    body = <Quiet title={t('console.noRecommendation')} text={t('console.noRecommendationBody')} />;
  } else {
    body = (
      <Recommendation
        decision={decision}
        valves={valves}
        regions={regions}
        position={position}
        total={items.length}
        onMove={(next) => {
          setIndex(next);
          onFocusValve(items[next]?.valveId ?? null);
        }}
      />
    );
  }

  return (
    <section
      className={cn(styles.card)}
      data-has-decision={decision !== null}
      aria-label={t('console.bandLabel')}
      onPointerEnter={light}
      onPointerLeave={dim}
      onFocus={light}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          dim();
        }
      }}
    >
      {body}
      <div className={cn(styles.footer)}>
        <AutopilotModeControl compact />
      </div>
    </section>
  );
}

function Quiet({
  title,
  text,
  alert = false,
}: {
  readonly title: string;
  readonly text: string;
  readonly alert?: boolean;
}): JSX.Element {
  return (
    <div className={cn(styles.text)}>
      <h2 id={TITLE_ID} className={cn(styles.quietTitle)}>
        {title}
      </h2>
      <p className={cn(styles.reason)} role={alert ? 'alert' : undefined}>
        {text}
      </p>
    </div>
  );
}

function Recommendation({
  decision,
  valves,
  regions,
  position,
  total,
  onMove,
}: {
  readonly decision: AutopilotDecisionView;
  readonly valves: readonly LiveValve[];
  readonly regions: readonly RegionView[];
  readonly position: number;
  readonly total: number;
  readonly onMove: (next: number) => void;
}): JSX.Element {
  const canAccept = usePermission(PERMISSION_VALVE_COMMAND);
  const { accept, reject } = useDecisionActions();
  const busy = accept.isPending || reject.isPending;
  const movesValve = decision.action === 'OPEN' || decision.action === 'CLOSE';
  const region = regionOfValve(regions, decision.valveId);
  const SourceIcon = decision.source === 'LLM' ? Bot : Cpu;
  const failure = accept.isError
    ? t('assistant.acceptError')
    : reject.isError
      ? t('assistant.rejectError')
      : null;

  return (
    <>
      <div className={cn(styles.text)}>
        <h2 id={TITLE_ID} className={cn(styles.title)}>
          {recommendationTitle(decision, valves)}
        </h2>
        <p className={cn(styles.reason)}>{decision.reason}</p>
        <ul className={cn(styles.facts)}>
          {region === null ? null : (
            <li>
              <MapPin aria-hidden="true" />
              {t('console.regionOf', { region: region.name })}
            </li>
          )}
          <li>
            <SourceIcon aria-hidden="true" />
            {t('console.sourceLine', {
              source: t(`assistant.source.${lower(decision.source)}`),
              confidence: t('assistant.confidence', {
                percent: formatDecimal(decision.confidence * PERCENT, WHOLE),
              }),
            })}
          </li>
        </ul>
      </div>
      <div className={cn(styles.actions)}>
        {movesValve && canAccept ? (
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              accept.mutate(decision.id);
            }}
          >
            <Check aria-hidden="true" />
            {accept.isPending ? t('assistant.working') : t('assistant.accept')}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            reject.mutate(decision.id);
          }}
        >
          <X aria-hidden="true" />
          {t('assistant.reject')}
        </Button>
        {total > 1 ? (
          <div className={cn(styles.pager)}>
            <button
              type="button"
              className={cn(styles.pagerButton)}
              aria-label={t('console.previous')}
              disabled={position === 0}
              onClick={() => {
                onMove(position - 1);
              }}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span aria-live="polite">
              {t('console.position', { current: String(position + 1), total: String(total) })}
            </span>
            <button
              type="button"
              className={cn(styles.pagerButton)}
              aria-label={t('console.next')}
              disabled={position === total - 1}
              onClick={() => {
                onMove(position + 1);
              }}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
        {movesValve && !canAccept ? (
          <p className={cn(styles.meta)}>{t('assistant.cannotAccept')}</p>
        ) : null}
        {failure === null ? null : (
          <p role="alert" className={cn(styles.meta)}>
            {failure}
          </p>
        )}
        {accept.isSuccess ? (
          <p role="status" className={cn(styles.meta)}>
            {t('assistant.accepted')}
          </p>
        ) : null}
        {reject.isSuccess ? (
          <p role="status" className={cn(styles.meta)}>
            {t('assistant.rejected')}
          </p>
        ) : null}
      </div>
    </>
  );
}
