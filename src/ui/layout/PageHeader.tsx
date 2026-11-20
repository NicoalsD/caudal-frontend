import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  /** One sentence that says what the screen is for; the `h1` lives in the top bar. */
  readonly lead?: ReactNode;
  /** The main actions of the screen ("Crear usuario"), kept on the right. */
  readonly actions?: ReactNode;
  /** Chips or tabs that filter what the screen lists, under the lead. */
  readonly filters?: ReactNode;
  readonly className?: string;
}

/** Header under the page title: a lead text on the left and the actions on the right. */
export function PageHeader({ lead, actions, filters, className }: PageHeaderProps): JSX.Element {
  return (
    <header className={cn(styles.header, className)}>
      <div className={cn(styles.text)}>
        {lead === undefined ? null : <p className={cn(styles.lead)}>{lead}</p>}
        {filters === undefined ? null : <div className={cn(styles.filters)}>{filters}</div>}
      </div>
      {actions === undefined ? null : <div className={cn(styles.actions)}>{actions}</div>}
    </header>
  );
}
