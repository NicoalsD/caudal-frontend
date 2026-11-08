import type { ComponentPropsWithoutRef, ElementType, JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './Card.module.css';
import { WaveArt } from './WaveArt';

export type Tint = 'mint' | 'aqua' | 'sand' | 'cream' | 'coral' | 'lavender' | 'hero';

interface CardOwnProps {
  /**
   * `plain` white surface; `tinted` pastel (pass `tint`); `dark` promotional brand card with wave
   * art; `hero` large card whose top edge is a wave.
   */
  readonly variant?: 'plain' | 'tinted' | 'dark' | 'hero';
  readonly tint?: Tint;
  /** Element to render: `section` with a heading, `article`, `li`, `div`. */
  readonly as?: ElementType;
  /** Lifts on hover; only for cards that are a target or reveal more. */
  readonly interactive?: boolean;
  readonly padded?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}

type CardProps = CardOwnProps & Omit<ComponentPropsWithoutRef<'div'>, keyof CardOwnProps>;

/** Base surface of every dashboard block. Variants never change the text colors' contrast. */
export function Card({
  variant = 'plain',
  tint = 'aqua',
  as: Tag = 'div',
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: CardProps): JSX.Element {
  return (
    <Tag
      {...rest}
      className={cn(
        styles.card,
        styles[variant],
        variant === 'tinted' && styles[`tint-${tint}`],
        interactive && styles.interactive,
        padded && styles.padded,
        variant === 'hero' && styles.heroPad,
        className,
      )}
    >
      {variant === 'dark' && <WaveArt />}
      {variant === 'hero' && <HeroWave />}
      {variant === 'dark' ? <div className={cn(styles.above)}>{children}</div> : children}
    </Tag>
  );
}

function HeroWave(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn(styles.wave)}
      viewBox="0 0 400 28"
      preserveAspectRatio="none"
    >
      <path d="M0 0 H400 V6 C 360 6, 340 26, 300 26 C 250 26, 240 4, 200 4 C 150 4, 130 24, 90 24 C 50 24, 30 6, 0 6 Z" />
    </svg>
  );
}
