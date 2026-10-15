import { useId, useRef, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import {
  ArrowDownRight,
  CheckCircle2,
  FileText,
  Globe,
  MessageSquareText,
  Pause,
  Play,
} from 'lucide-react';

import { strings } from '../../i18n/es';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import { DEMO_LEVEL_SHARE } from './demo';
import {
  OperatorScreen,
  ProposalList,
  ScheduleList,
  SimulatedTag,
  shareStyle,
} from './DemoScreens';
import styles from './FlowShowcase.module.css';
import { prefersReducedMotion, useInView } from './useReveal';

const copy = strings.landing.flow;

const NEXT = 1;
const PREVIOUS = -1;
/** Roving tab index: only the selected tab is in the tab order. */
const NOT_TABBABLE = -1;

const STEP_ORDER = ['reading', 'status', 'proposal', 'decision', 'publication'] as const;
type StepKey = (typeof STEP_ORDER)[number];

function StatusStep(): JSX.Element {
  const step = copy.steps.status;
  return (
    <div className={cn(styles.status)}>
      <div className={cn(styles.tank)} style={shareStyle(DEMO_LEVEL_SHARE)}>
        <span className={cn(styles.tankWater)} />
        <span className={cn(styles.tankLine)} />
      </div>
      <div className={cn(styles.statusFacts)}>
        <span className={cn(styles.factLabel)}>{step.level}</span>
        <span className={cn(styles.factValue)}>
          {strings.landing.operator.gauge}
          <small>{strings.landing.operator.unit}</small>
        </span>
        <span className={cn(styles.factMeta)}>{step.age}</span>
        <span className={cn(styles.factTrend)}>
          <ArrowDownRight aria-hidden="true" />
          {step.trend}
        </span>
        <span className={cn(styles.factCheck)}>
          <CheckCircle2 aria-hidden="true" />
          {step.check}
        </span>
      </div>
    </div>
  );
}

function DecisionStep(): JSX.Element {
  const step = copy.steps.decision;
  return (
    <div className={cn(styles.decision)}>
      <ProposalList compact />
      <div className={cn(styles.reasonBox)}>
        <span className={cn(styles.reasonLabel)}>{step.reasonLabel}</span>
        <p className={cn(styles.reasonText)}>{step.reason}</p>
      </div>
      <span className={cn(styles.confirm)}>{step.confirm}</span>
    </div>
  );
}

function PublicationStep(): JSX.Element {
  const step = copy.steps.publication;
  return (
    <div className={cn(styles.publication)}>
      <figure className={cn(styles.output)}>
        <figcaption>
          <Globe aria-hidden="true" />
          {step.page}
        </figcaption>
        <ScheduleList />
      </figure>
      <figure className={cn(styles.output, styles.whatsapp)}>
        <figcaption>
          <MessageSquareText aria-hidden="true" />
          {step.whatsapp}
        </figcaption>
        <p className={cn(styles.bubble)}>
          {t('landing.flow.steps.publication.message', {
            title: strings.landing.family.title,
            first: strings.landing.sectors.school,
            firstHours: strings.landing.hours.school,
            second: strings.landing.sectors.alto,
            secondHours: strings.landing.hours.alto,
          })}
        </p>
      </figure>
      <figure className={cn(styles.output, styles.poster)}>
        <figcaption>
          <FileText aria-hidden="true" />
          {step.poster}
        </figcaption>
        <div className={cn(styles.sheet)}>
          <span className={cn(styles.sheetTitle)}>{strings.landing.family.title}</span>
          <span className={cn(styles.sheetLine)} />
          <span className={cn(styles.sheetLine)} />
          <span className={cn(styles.sheetLine)} />
        </div>
      </figure>
    </div>
  );
}

function StepScreen({ step }: { readonly step: StepKey }): JSX.Element {
  switch (step) {
    case 'reading':
      return (
        <div className={cn(styles.readingStage)}>
          <div className={cn(styles.readingPhone)}>
            <OperatorScreen />
          </div>
        </div>
      );
    case 'status':
      return <StatusStep />;
    case 'proposal':
      return <ProposalList />;
    case 'decision':
      return <DecisionStep />;
    case 'publication':
      return <PublicationStep />;
  }
}

/**
 * The day in five steps, in a product window with tabs under it. The steps advance on their own
 * while the window is on screen; the visitor can pause, and choosing a tab stops the tour. With
 * reduced motion nothing advances by itself.
 */
export function FlowShowcase(): JSX.Element {
  const baseId = useId();
  const [active, setActive] = useState<StepKey>('reading');
  // With reduced motion nothing advances by itself.
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [frameRef, inView] = useInView<HTMLDivElement>();
  const tabRefs = useRef<Partial<Record<StepKey, HTMLButtonElement | null>>>({});

  const advance = (): void => {
    const next = STEP_ORDER[(STEP_ORDER.indexOf(active) + 1) % STEP_ORDER.length];
    if (next !== undefined) {
      setActive(next);
    }
  };

  const choose = (step: StepKey): void => {
    setActive(step);
    setPlaying(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const offsets: Record<string, number> = { ArrowRight: NEXT, ArrowLeft: PREVIOUS };
    const offset = offsets[event.key];
    const edge =
      event.key === 'Home'
        ? STEP_ORDER[0]
        : event.key === 'End'
          ? STEP_ORDER.at(PREVIOUS)
          : undefined;
    let target: StepKey | undefined = edge;
    if (offset !== undefined) {
      const index = (STEP_ORDER.indexOf(active) + offset + STEP_ORDER.length) % STEP_ORDER.length;
      target = STEP_ORDER[index];
    }
    if (target !== undefined) {
      event.preventDefault();
      choose(target);
      tabRefs.current[target]?.focus();
    }
  };

  const tabId = (step: StepKey): string => `${baseId}-tab-${step}`;
  const panelId = `${baseId}-panel`;
  const current = copy.steps[active];

  return (
    <div className={cn(styles.showcase)} ref={frameRef}>
      <div className={cn(styles.window)}>
        <div className={cn(styles.windowBar)}>
          <span className={cn(styles.windowBrand)}>{strings.app.name}</span>
          <span className={cn(styles.windowTitle)}>{current.title}</span>
          <SimulatedTag />
        </div>
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={tabId(active)}
          className={cn(styles.panel)}
          tabIndex={0}
        >
          <div key={active} className={cn(styles.stage)}>
            <StepScreen step={active} />
          </div>
          <p className={cn(styles.stepBody)}>{current.body}</p>
        </div>
      </div>

      <div className={cn(styles.controls)}>
        <div role="tablist" aria-label={copy.tabsLabel} className={cn(styles.tabs)}>
          {STEP_ORDER.map((step) => {
            const selected = step === active;
            return (
              <button
                key={step}
                ref={(element) => {
                  tabRefs.current[step] = element;
                }}
                id={tabId(step)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : NOT_TABBABLE}
                className={cn(styles.tab)}
                onClick={() => choose(step)}
                onKeyDown={onKeyDown}
              >
                {copy.steps[step].tab}
                {selected && playing ? (
                  <span
                    className={cn(styles.progress, inView && styles.progressRunning)}
                    onAnimationEnd={advance}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={cn(styles.playToggle)}
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? copy.pause : copy.play}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
