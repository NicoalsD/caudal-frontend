import type { ComponentProps, JSX } from 'react';
import { Link } from 'react-router';

import { buttonClass } from './Button';
import type { ButtonVariant } from './Button';

interface LinkButtonProps extends ComponentProps<typeof Link> {
  /** Same look as Button: `primary` is the one main action of the screen. */
  readonly variant?: ButtonVariant;
}

/** A navigation link drawn as a button (large target, same tokens as Button). */
export function LinkButton({
  variant = 'secondary',
  className,
  ...link
}: LinkButtonProps): JSX.Element {
  return <Link {...link} className={buttonClass(variant, className)} />;
}
