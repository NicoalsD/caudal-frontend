import type { JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './Avatar.module.css';

const MAX_INITIALS = 2;

/** "Nicolas Diaz" -> "ND"; one word gives one letter; empty gives an empty string. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word !== '')
    .slice(0, MAX_INITIALS)
    .map((word) => word.charAt(0).toLocaleUpperCase('es'))
    .join('');
}

interface AvatarProps {
  readonly name: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly tone?: 'aqua' | 'mint' | 'sand' | 'coral' | 'lavender' | 'dark';
  /**
   * True when the name is written next to the avatar (the usual case): the circle is then hidden
   * from assistive technology. False gives it the name as its accessible label.
   */
  readonly decorative?: boolean;
  readonly className?: string;
}

/** Circle with the initials of a person or entity. */
export function Avatar({
  name,
  size = 'md',
  tone = 'aqua',
  decorative = true,
  className,
}: AvatarProps): JSX.Element {
  return (
    <span
      className={cn(styles.avatar, styles[size], styles[tone], className)}
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}
    >
      {initialsOf(name)}
    </span>
  );
}
