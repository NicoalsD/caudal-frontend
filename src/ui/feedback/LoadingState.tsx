import type { JSX } from 'react';

interface LoadingStateProps {
  readonly message: string;
}

/** Polite status text for a screen that is waiting for data. */
export function LoadingState({ message }: LoadingStateProps): JSX.Element {
  return <p role="status">{message}</p>;
}
