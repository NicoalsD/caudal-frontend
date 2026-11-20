import type { JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './WaveArt.module.css';

interface WaveArtProps {
  readonly className?: string;
}

/** Subtle line art of flowing water for dark cards. Pure decoration, hidden from assistive tech. */
export function WaveArt({ className }: WaveArtProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn(styles.art, className)}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMaxYMax slice"
      fill="none"
      strokeLinecap="round"
    >
      <path d="M0 150 C 60 110, 120 190, 200 150 S 340 110, 400 150" className={cn(styles.l1)} />
      <path d="M0 175 C 60 135, 120 215, 200 175 S 340 135, 400 175" className={cn(styles.l2)} />
      <path d="M0 200 C 60 160, 120 240, 200 200 S 340 160, 400 200" className={cn(styles.l3)} />
      <path d="M0 125 C 70 85, 130 165, 210 125 S 340 85, 400 125" className={cn(styles.l3)} />
    </svg>
  );
}
