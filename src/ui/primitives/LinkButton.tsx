import type { ComponentProps, JSX } from 'react';
import { Link } from 'react-router';

import { cn } from '../styles/cn';
import styles from './Button.module.css';

interface LinkButtonProps extends ComponentProps<typeof Link> {
  /** Same look as Button: `primary` is the one main action of the screen. */
  readonly variant?: 'primary' | 'secondary';
}

/** A navigation link drawn as a button (large target, same tokens as Button). */
export function LinkButton({
  variant = 'secondary',
  className,
  ...link
}: LinkButtonProps): JSX.Element {
  return (
    <Link
      {...link}
      className={cn(
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        className,
      )}
    />
  );
}
