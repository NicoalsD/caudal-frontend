import { useEffect, useId, useRef, useState } from 'react';
import type { JSX, ReactNode, RefObject } from 'react';

import { cn } from '../styles/cn';
import styles from './Popover.module.css';

export interface PopoverTriggerProps {
  readonly ref: RefObject<HTMLButtonElement | null>;
  readonly onClick: () => void;
  readonly 'aria-expanded': boolean;
  readonly 'aria-controls': string;
  readonly 'aria-haspopup': 'true';
}

interface PopoverProps {
  /** Draws the trigger button; spread the received props on it. */
  readonly renderTrigger: (props: PopoverTriggerProps) => ReactNode;
  /** Accessible name of the panel. */
  readonly label: string;
  readonly align?: 'start' | 'end';
  readonly className?: string | undefined;
  /** Content of the panel; a function receives `close`. */
  readonly children: ReactNode | ((close: () => void) => ReactNode);
}

/**
 * Disclosure panel under a trigger (not a modal): closes with Escape (focus returns to the
 * trigger), with a click outside, or when the focus leaves it. The panel is a plain group, so its
 * buttons and links are reached with Tab and nothing needs arrow-key handling.
 */
export function Popover({
  renderTrigger,
  label,
  align = 'start',
  className,
  children,
}: PopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = (): void => {
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    // Escape and focus-out are delegated here from the trigger and the panel, which are the
    // interactive elements; the wrapper itself is not a control.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={root}
      className={cn(styles.root, className)}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (
          open &&
          event.relatedTarget instanceof Node &&
          !root.current?.contains(event.relatedTarget)
        ) {
          setOpen(false);
        }
      }}
    >
      {renderTrigger({
        ref: trigger,
        onClick: () => {
          setOpen((current) => !current);
        },
        'aria-expanded': open,
        'aria-controls': panelId,
        'aria-haspopup': 'true',
      })}
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className={cn(styles.panel, align === 'end' && styles.end)}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  );
}
