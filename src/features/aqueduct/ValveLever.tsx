import { useRef, useState } from 'react';
import type { JSX, KeyboardEvent, PointerEvent } from 'react';
import { ChevronsRight, Lock } from 'lucide-react';

import type { ValveAction } from '../../core/valves/valveModel';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import styles from './ValveLever.module.css';

/** Share of the travel the hand must reach to throw the lever. */
const THROW_AT = 0.96;
/** The lever is stiff at first and gives way at the end: shown = pulled ^ STIFFNESS. */
const STIFFNESS = 1.7;
/** One arrow key moves the lever this share of the travel (before the stiffness). */
const KEY_STEP = 0.1;
const PERCENT = 100;
const NOT_FOCUSABLE = -1;
const VIBRATE_MS = 18;
/** The grip's tilt: from TILT_START degrees at rest to TILT_START + TILT_RANGE at the end. */
const TILT_START = -18;
const TILT_RANGE = 36;

interface ValveLeverProps {
  readonly action: ValveAction;
  /** The valve's name, for the accessible name of the lever. */
  readonly valveName: string;
  /** Locked until the reason is valid; trying to move it then calls `onLocked`. */
  readonly locked: boolean;
  readonly busy: boolean;
  readonly onLocked: () => void;
  readonly onThrow: () => void;
}

/**
 * The valve's lever: drag the handle along the pipe to the end to open (or close) the valve. It
 * resists at first and gives way near the end, like a real lever; let go before the end and it
 * springs back. The water in the pipe follows the handle. Keyboard: arrows move it, Enter or End
 * throws it. Locked while the reason is missing.
 */
export function ValveLever({
  action,
  valveName,
  locked,
  busy,
  onLocked,
  onThrow,
}: ValveLeverProps): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; travel: number } | null>(null);
  const [pulled, setPulled] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [thrown, setThrown] = useState(false);
  const shown = thrown ? 1 : Math.pow(pulled, STIFFNESS);
  const opening = action === 'OPEN';
  const water = opening ? shown : 1 - shown;
  const frozen = busy || thrown;

  const travelOf = (): number => {
    const track = trackRef.current;
    const handle = handleRef.current;
    if (track === null || handle === null) {
      return 1;
    }
    return Math.max(1, track.clientWidth - handle.offsetWidth);
  };

  const release = (): void => {
    setDragging(false);
    drag.current = null;
    if (pulled >= THROW_AT) {
      setThrown(true);
      setPulled(1);
      navigator.vibrate?.(VIBRATE_MS);
      onThrow();
    } else {
      setPulled(0);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (frozen) {
      return;
    }
    if (locked) {
      onLocked();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX - pulled * travelOf(), travel: travelOf() };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const current = drag.current;
    if (current === null) {
      return;
    }
    const next = (event.clientX - current.startX) / current.travel;
    setPulled(Math.min(1, Math.max(0, next)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (frozen) {
      return;
    }
    const key = event.key;
    if (
      !['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Home', 'End', 'Enter'].includes(key)
    ) {
      return;
    }
    event.preventDefault();
    if (locked) {
      onLocked();
      return;
    }
    if (key === 'End' || key === 'Enter') {
      setThrown(true);
      setPulled(1);
      onThrow();
      return;
    }
    if (key === 'Home') {
      setPulled(0);
      return;
    }
    const step = key === 'ArrowRight' || key === 'ArrowUp' ? KEY_STEP : -KEY_STEP;
    const next = Math.min(1, Math.max(0, pulled + step));
    if (next >= THROW_AT) {
      setThrown(true);
      setPulled(1);
      onThrow();
      return;
    }
    setPulled(next);
  };

  const label = opening
    ? t('valveLever.labelOpen', { valve: valveName })
    : t('valveLever.labelClose', { valve: valveName });
  const hint = thrown
    ? opening
      ? t('valveLever.thrownOpen')
      : t('valveLever.thrownClose')
    : locked
      ? t('valveLever.locked')
      : opening
        ? t('valveLever.slideOpen')
        : t('valveLever.slideClose');

  return (
    <div className={cn(styles.lever)} data-locked={locked} data-thrown={thrown}>
      <div className={cn(styles.ends)} aria-hidden="true">
        <span>{opening ? t('valveLever.endClosed') : t('valveLever.endOpen')}</span>
        <span>{opening ? t('valveLever.endOpen') : t('valveLever.endClosed')}</span>
      </div>
      <div ref={trackRef} className={cn(styles.track)}>
        <div
          className={cn(styles.water, !dragging && styles.settle)}
          style={{ inlineSize: `${water * PERCENT}%` }}
          aria-hidden="true"
        />
        <p className={cn(styles.hint)} style={{ opacity: 1 - shown }} aria-hidden="true">
          {hint}
          {locked ? null : <ChevronsRight aria-hidden="true" />}
        </p>
        <div
          ref={handleRef}
          role="slider"
          tabIndex={frozen ? NOT_FOCUSABLE : 0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={PERCENT}
          aria-valuenow={Math.round(shown * PERCENT)}
          aria-valuetext={hint}
          aria-disabled={locked || frozen ? true : undefined}
          className={cn(styles.handle, !dragging && styles.settle)}
          style={{
            insetInlineStart: `calc((100% - var(--lever-handle)) * ${shown})`,
            ['--lever-tilt' as string]: `${TILT_START + shown * TILT_RANGE}deg`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={onKeyDown}
        >
          <span className={cn(styles.grip)} aria-hidden="true">
            {locked ? <Lock /> : null}
          </span>
        </div>
      </div>
      <p className={cn(styles.status)} role="status">
        {thrown ? hint : ''}
      </p>
    </div>
  );
}
