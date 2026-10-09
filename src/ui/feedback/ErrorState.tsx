import type { JSX, ReactNode } from 'react';

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
    <section role="alert">
      <ScreenTitle>{title}</ScreenTitle>
      <p>{message}</p>
      {action}
    </section>
  );
}
