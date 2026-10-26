import type { JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './FormAlert.module.css';

interface FormAlertProps {
  readonly message: string;
  /** Extra line such as the support code of a server error. */
  readonly detail?: string | null | undefined;
}

/** Error that belongs to the whole form, announced as soon as it appears. */
export function FormAlert({ message, detail }: FormAlertProps): JSX.Element {
  return (
    <div role="alert" className={cn(styles.alert)}>
      <p className={cn(styles.message)}>{message}</p>
      {detail === undefined || detail === null ? null : <p>{detail}</p>}
    </div>
  );
}
