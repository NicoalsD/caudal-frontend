import type { ComponentPropsWithRef, JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './Button.module.css';

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'type'> {
  /** `primary` is the single main action of a screen; the rest are `secondary`. */
  readonly variant?: 'primary' | 'secondary';
  /** Submit buttons inside a form; everything else is `button` so it never submits by accident. */
  readonly type?: 'button' | 'submit';
}

export function Button({
  variant = 'secondary',
  type = 'button',
  className,
  ...button
}: ButtonProps): JSX.Element {
  return (
    <button
      {...button}
      type={type}
      className={cn(
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        className,
      )}
    />
  );
}
