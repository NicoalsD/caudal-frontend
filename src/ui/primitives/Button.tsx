import type { ComponentPropsWithRef, JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark';

/** CSS classes of a button look; Button, LinkButton and other pill controls share them. */
export function buttonClass(variant: ButtonVariant, className?: string): string {
  return cn(styles.button, styles[variant], className);
}

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type'> {
  /**
   * `primary` is the single main action of a screen; `secondary` the rest; `ghost` a quiet action
   * with no outline; `onDark` a light pill for dark surfaces (promo card, rail).
   */
  readonly variant?: ButtonVariant;
  /** Submit buttons inside a form; everything else is `button` so it never submits by accident. */
  readonly type?: 'button' | 'submit';
}

export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...button
}: ButtonProps): JSX.Element {
  return <button {...button} type={type} className={buttonClass(variant, className)} />;
}
