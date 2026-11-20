import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './ErrorState.module.css';
import { ScreenTitle } from './ScreenTitle';

interface ErrorStateProps {
  readonly title: string;
  readonly message: string;
  /** Optional action, for example a link home. Rendered by the caller. */
  readonly action?: ReactNode;
}

/** Presentational error block with text and an optional action. */
export function ErrorState({ title, message, action }: ErrorStateProps): JSX.Element {
  return (
    <section role="alert" className={cn(styles.state)}>
      <ScreenTitle>{title}</ScreenTitle>
      <p>{message}</p>
      {action === undefined ? null : <div className={cn(styles.actions)}>{action}</div>}
    </section>
  );
}
