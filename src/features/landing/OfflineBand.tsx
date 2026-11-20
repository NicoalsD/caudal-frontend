import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';

import { strings } from '../../i18n/es';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import { AppScreen } from './AppScreen';
import { PhoneFrame, SimulatedTag } from './Frames';
import { SECTION_IDS } from './links';
import styles from './OfflineBand.module.css';
import { prefersReducedMotion, useInView } from './useReveal';

const copy = strings.landing.offline;

/** One beat of the loop. Every state lasts a whole number of beats. */
const BEAT_MS = 800;
/** Readings waiting in the phone when the signal is lost. */
const QUEUED = 3;

const STATES = [
  { key: 'offline', Icon: CloudOff, beats: 4 },
  { key: 'sending', Icon: RefreshCw, beats: QUEUED },
  { key: 'sent', Icon: CheckCircle2, beats: 5 },
] as const;

const CYCLE_BEATS = STATES.reduce((total, state) => total + state.beats, 0);

interface Moment {
  /** Index of the state that is lit. */
  readonly lit: number;
  /** Readings still waiting in the phone. */
  readonly pending: number;
}

/** Where the loop is at a given beat: the lit state and how many readings are still waiting. */
function momentAt(beat: number): Moment {
  let start = 0;
  for (const [index, state] of STATES.entries()) {
    if (beat < start + state.beats) {
      const pending =
        state.key === 'offline' ? QUEUED : state.key === 'sending' ? QUEUED - (beat - start) : 0;
      return { lit: index, pending };
    }
    start += state.beats;
  }
  return { lit: 0, pending: QUEUED };
}

/**
 * Full-width band of deep water. A reading taken without signal walks through the three states of
 * the connection bar (ux-guidelines section 7) as a real flow: the track fills from one state to the
 * next and the pending count goes down as the readings leave. It loops only while the band is on
 * screen; with reduced motion it rests on the first state.
 */
export function OfflineBand(): JSX.Element {
  const [ref, inView] = useInView<HTMLElement>();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) {
      return undefined;
    }
    const timer = window.setInterval(() => setBeat((value) => (value + 1) % CYCLE_BEATS), BEAT_MS);
    return () => window.clearInterval(timer);
  }, [inView]);

  const { lit, pending } = momentAt(beat);

  return (
    <section
      id={SECTION_IDS.offline}
      ref={ref}
      className={cn(styles.band)}
      aria-labelledby={`${SECTION_IDS.offline}-title`}
    >
      <div className={cn(styles.inner)}>
        <div className={cn(styles.text)}>
          <h2 id={`${SECTION_IDS.offline}-title`} className={cn(styles.title)}>
            {copy.title}
          </h2>
          <p className={cn(styles.body)}>{copy.body}</p>

          <ol className={cn(styles.steps)} aria-label={copy.statesLabel}>
            {STATES.map(({ key, Icon }, index) => {
              const phase = index < lit ? 'done' : index === lit ? 'current' : 'upcoming';
              return (
                <li
                  key={key}
                  className={cn(styles.step)}
                  data-phase={phase}
                  data-tone={key}
                  aria-current={phase === 'current' ? 'step' : undefined}
                >
                  <span className={cn(styles.node)} aria-hidden="true">
                    <Icon className={cn(key === 'sending' && phase === 'current' && styles.spin)} />
                  </span>
                  <span className={cn(styles.stepIndex)}>
                    {t('landing.offline.stepLabel', {
                      step: String(index + 1),
                      total: String(STATES.length),
                    })}
                  </span>
                  <span className={cn(styles.stepLabel)}>{copy.states[key].label}</span>
                  <span className={cn(styles.stepDetail)}>{copy.states[key].detail}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <figure className={cn(styles.device)}>
          <PhoneFrame className={cn(styles.phone)}>
            <AppScreen shot="operatorOffline" alt={copy.phoneLabel} />
          </PhoneFrame>
          <div className={cn(styles.counter)} data-tone={STATES[lit]?.key} aria-hidden="true">
            <span className={cn(styles.counterValue)} key={pending}>
              {pending}
            </span>
            <span className={cn(styles.counterLabel)}>{copy.pendingLabel}</span>
          </div>
          <SimulatedTag className={cn(styles.tag)} />
        </figure>
      </div>
    </section>
  );
}
