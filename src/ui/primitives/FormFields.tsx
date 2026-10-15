import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './FormFields.module.css';

interface FormFieldsProps {
  /** True while the form is being sent: every control inside is disabled. */
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

/** One column of fields with the spacing of the design tokens, disabled as a group. */
export function FormFields({ disabled = false, children }: FormFieldsProps): JSX.Element {
  return (
    <fieldset className={cn(styles.fields)} disabled={disabled}>
      {children}
    </fieldset>
  );
}
