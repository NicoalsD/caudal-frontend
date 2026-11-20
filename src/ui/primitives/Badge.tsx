import { AlertTriangle, CheckCircle2, Circle, Info, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './Badge.module.css';

export type BadgeTone = 'ok' | 'warning' | 'error' | 'info' | 'neutral';

const ICONS: Readonly<Record<BadgeTone, LucideIcon>> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  neutral: Circle,
};

const TONE_TEXT = {
  ok: 'ui.statusOk',
  warning: 'ui.statusWarning',
  error: 'ui.statusError',
  info: 'ui.statusInfo',
  neutral: 'ui.statusNeutral',
} as const;

interface BadgeProps {
  readonly tone: BadgeTone;
  /** What the state is, in words. Without it the badge says the generic name of the tone. */
  readonly children?: ReactNode;
  readonly className?: string;
}

/** State pill: an icon, a tint and a word, so the state never depends on color alone. */
export function Badge({ tone, children, className }: BadgeProps): JSX.Element {
  const Icon = ICONS[tone];
  return (
    <span className={cn(styles.badge, styles[tone], className)}>
      <Icon aria-hidden="true" className={cn(styles.icon)} />
      {children ?? t(TONE_TEXT[tone])}
    </span>
  );
}
