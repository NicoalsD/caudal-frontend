import type { ComponentPropsWithRef, JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type' | 'aria-label'> {
  /** Accessible name and tooltip text; an icon alone never names a control. */
  readonly label: string;
  /** The icon, already `aria-hidden`. */
  readonly children: ReactNode;
  readonly tone?: 'plain' | 'soft' | 'onDark';
  /** A small count or dot drawn on the corner; its meaning belongs in `label`. */
  readonly badge?: ReactNode;
  readonly type?: 'button' | 'submit';
}

/** Round icon-only button with a 48 px target and a tooltip on hover and focus. */
export function IconButton({
  label,
  children,
  tone = 'soft',
  badge,
  type = 'button',
  className,
  ...button
}: IconButtonProps): JSX.Element {
  return (
    <button
      {...button}
      type={type}
      aria-label={label}
      className={cn(styles.button, styles[tone], className)}
    >
      {children}
      {badge === undefined || badge === null || badge === false ? null : (
        <span className={cn(styles.badge)} aria-hidden="true">
          {badge}
        </span>
      )}
      <span className={cn(styles.tip)} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
