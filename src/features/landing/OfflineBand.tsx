import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';

import { strings } from '../../i18n/es';
import { cn } from '../../ui/styles/cn';
import { SECTION_IDS } from './links';
import styles from './OfflineBand.module.css';
import { prefersReducedMotion, useInView } from './useReveal';

const copy = strings.landing.offline;

/** How long each state of the connection bar stays lit in the demo loop. */
const STATE_DURATION_MS = 2600;

const STATES = [
  { key: 'offline', Icon: CloudOff, pending: '3' },
  { key: 'sending', Icon: RefreshCw, pending: '2' },
  { key: 'sent', Icon: CheckCircle2, pending: '0' },
] as const;

/**
 * Full-width band of deep water. The three states of the connection bar (ux-guidelines section 7)
 * are all listed; when the band comes on screen the lit one walks through them once, as a plumber
 * would see it when the signal comes back.
 */
export function OfflineBand(): JSX.Element {
  const [ref, inView] = useInView<HTMLElement>();
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) {
      return undefined;
    }
    // Plays once each time the band enters the screen and rests on "sent", so nothing keeps moving.
    const timers = STATES.map((_, index) =>
      window.setTimeout(() => setLit(index), STATE_DURATION_MS * index),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView]);

  const current = STATES[lit] ?? STATES[0];

  return (
    <section
      id={SECTION_IDS.offline}
      ref={ref}
      className={cn(styles.band)}
      aria-labelledby={`${SECTION_IDS.offline}-title`}
    >
      <div className={cn(styles.inner)}>
        <h2 id={`${SECTION_IDS.offline}-title`} className={cn(styles.title)}>
          {copy.title}
        </h2>
        <p className={cn(styles.body)}>{copy.body}</p>

        <div className={cn(styles.counter)} aria-hidden="true">
          <span className={cn(styles.counterValue)} key={current.pending}>
            {current.pending}
          </span>
          <span className={cn(styles.counterLabel)}>{copy.pendingLabel}</span>
        </div>

        <ol className={cn(styles.states)} aria-label={copy.statesLabel}>
          {STATES.map(({ key, Icon }, index) => (
            <li
              key={key}
              className={cn(styles.state, styles[key], index === lit && styles.lit)}
              aria-current={index === lit ? 'step' : undefined}
            >
              <Icon aria-hidden="true" className={cn(key === 'sending' && styles.spin)} />
              <span>{copy.states[key]}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
