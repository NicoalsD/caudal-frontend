import { useId, useRef, useState } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { MessageSquareText, Pause, Play } from 'lucide-react';

import { strings } from '../../i18n/es';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import { AppScreen } from './AppScreen';
import type { AppShot } from './AppScreen';
import { PhoneFrame, SimulatedTag } from './Frames';
import styles from './FlowShowcase.module.css';
import { prefersReducedMotion, useInView } from './useReveal';

const copy = strings.landing.flow;

const NEXT = 1;
const PREVIOUS = -1;
/** Roving tab index: only the selected tab is in the tab order. */
const NOT_TABBABLE = -1;

const STEP_ORDER = ['reading', 'status', 'proposal', 'decision', 'publication'] as const;
type StepKey = (typeof STEP_ORDER)[number];

/** The real screen each step shows, and what a screen reader hears of it. */
const STEP_SHOTS: Record<StepKey, AppShot> = {
  reading: 'operatorReading',
  status: 'boardTank',
  proposal: 'boardProposal',
  decision: 'boardApprove',
  publication: 'publicSchedule',
};

function StepScreen({ step }: { readonly step: StepKey }): JSX.Element {
  const phone = (
    <PhoneFrame className={cn(styles.stagePhone)}>
      <AppScreen shot={STEP_SHOTS[step]} alt={copy.steps[step].shot} />
    </PhoneFrame>
  );
  if (step !== 'publication') {
    return <div className={cn(styles.stageRow)}>{phone}</div>;
  }
  return (
    <div className={cn(styles.stageRow)}>
      {phone}
      <figure className={cn(styles.whatsapp)}>
        <figcaption>
          <MessageSquareText aria-hidden="true" />
          {copy.steps.publication.whatsapp}
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
    </div>
  );
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

  // Resuming shows the next step right away, so the button answers the press at once.
  const togglePlaying = (): void => {
    if (!playing) {
      advance();
    }
    setPlaying(!playing);
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
          onClick={togglePlaying}
          aria-label={playing ? copy.pause : copy.play}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
