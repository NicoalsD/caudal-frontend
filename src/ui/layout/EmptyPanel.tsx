import type { LucideIcon } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './EmptyPanel.module.css';

interface EmptyPanelProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

/** Empty state of a list that is not a table: an icon, one line that says why and an action. */
export function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: EmptyPanelProps): JSX.Element {
  return (
    <div className={cn(styles.panel)}>
      <span className={cn(styles.icon)}>
        <Icon aria-hidden="true" />
      </span>
      <p className={cn(styles.title)}>{title}</p>
      {description === undefined ? null : <p className={cn(styles.text)}>{description}</p>}
      {action}
    </div>
  );
}
