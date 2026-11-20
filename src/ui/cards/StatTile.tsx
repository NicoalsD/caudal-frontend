import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import { Card } from './Card';
import type { Tint } from './Card';
import styles from './StatTile.module.css';

export interface StatDelta {
  /** Text already formatted with its sign, for example "+0,4 m" or "-2 %". */
  readonly text: string;
  readonly trend: 'up' | 'down' | 'flat';
  /** Whether the change is good news; it sets the color. The arrow and the word still say the rest. */
  readonly tone?: 'good' | 'bad' | 'warn' | 'neutral';
}

interface StatTileProps {
  readonly icon: LucideIcon;
  readonly label: string;
  /** The main figure, already formatted with its unit. */
  readonly value: ReactNode;
  readonly delta?: StatDelta | undefined;
  readonly tint?: Tint;
  /** Extra lines under the label (a small list of regions, a hint). Keep it short. */
  readonly footer?: ReactNode;
  readonly className?: string;
}

const TREND_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus } as const;
const TREND_TEXT = { up: 'ui.deltaUp', down: 'ui.deltaDown', flat: 'ui.deltaFlat' } as const;

/**
 * Pastel tile: icon in a white square, a big value, its label and an optional change. The change
 * carries an arrow and a visually hidden word, so color is never the only signal.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  tint = 'aqua',
  footer,
  className,
}: StatTileProps): JSX.Element {
  const TrendIcon = delta === undefined ? null : TREND_ICON[delta.trend];
  return (
    <Card variant="tinted" tint={tint} as="div" className={cn(styles.tile, className)}>
      <span className={cn(styles.icon)}>
        <Icon aria-hidden="true" />
      </span>
      <p className={cn(styles.value)}>{value}</p>
      <p className={cn(styles.label)}>{label}</p>
      {delta !== undefined && TrendIcon !== null && (
        <p className={cn(styles.delta, styles[delta.tone ?? 'neutral'])}>
          <TrendIcon aria-hidden="true" />
          <span className={cn(styles.sr)}>{`${t(TREND_TEXT[delta.trend])} `}</span>
          {delta.text}
        </p>
      )}
      {footer !== undefined && <div className={cn(styles.footer)}>{footer}</div>}
    </Card>
  );
}
