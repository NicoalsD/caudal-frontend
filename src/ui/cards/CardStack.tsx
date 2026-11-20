import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties, JSX, KeyboardEvent, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { IconButton } from '../primitives/IconButton';
import { cn } from '../styles/cn';
import styles from './CardStack.module.css';

export interface StackItem {
  readonly id: string;
  /** Short name read when the card comes to the front ("Abrir la llave del sector Norte"). */
  readonly label: string;
  /** The card itself (usually a `Card`). Only the front card keeps its controls reachable. */
  readonly content: ReactNode;
}

interface CardStackProps {
  /** Names the collection ("Recomendaciones del asistente"). */
  readonly label: string;
  readonly items: readonly StackItem[];
  /** Controlled index of the front card; leave out to let the stack keep it. */
  readonly index?: number;
  readonly onIndexChange?: (index: number) => void;
  readonly className?: string;
}

/**
 * Cards fanned one behind another. The front card is the only one with reachable controls; the
 * others peek out and come forward with a click, with Previous / Next, or with the arrow keys.
 * It is a carousel for assistive technology: the position is announced politely. Reduced motion
 * turns the animation off (tokens set the durations to zero).
 */
export function CardStack({
  label,
  items,
  index,
  onIndexChange,
  className,
}: CardStackProps): JSX.Element {
  const [own, setOwn] = useState(0);
  const last = items.length - 1;
  const active = Math.min(Math.max(index ?? own, 0), Math.max(last, 0));
  const go = (next: number): void => {
    const target = Math.min(Math.max(next, 0), last);
    setOwn(target);
    onIndexChange?.(target);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(active + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(active - 1);
    }
  };
  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className={cn(styles.root, className)}
    >
      {/* The group takes the arrow keys when focused; the buttons below do the same with a mouse. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */}
      <ul className={cn(styles.stack)} tabIndex={0} aria-label={label} onKeyDown={onKeyDown}>
        {items.map((item, position) => {
          const offset = position - active;
          const style = {
            '--offset': offset,
            '--distance': Math.abs(offset),
          } as CSSProperties;
          const front = offset === 0;
          return (
            <li
              key={item.id}
              className={cn(styles.slot)}
              style={style}
              data-front={front}
              aria-roledescription="slide"
              aria-label={item.label}
            >
              <div className={cn(styles.card)} inert={!front}>
                {item.content}
              </div>
              {!front && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  className={cn(styles.pick)}
                  onClick={() => {
                    go(position);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className={cn(styles.controls)}>
        <IconButton
          label={t('ui.stackPrevious')}
          disabled={active <= 0}
          onClick={() => {
            go(active - 1);
          }}
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        <p className={cn(styles.position)} role="status">
          {t('ui.stackPosition', { current: String(active + 1), total: String(items.length) })}
        </p>
        <IconButton
          label={t('ui.stackNext')}
          disabled={active >= last}
          onClick={() => {
            go(active + 1);
          }}
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </section>
  );
}
