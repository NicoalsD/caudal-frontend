import { useId } from 'react';
import type { ComponentPropsWithRef, JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './TextField.module.css';

type InputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'id' | 'aria-invalid' | 'aria-describedby' | 'children'
>;

interface TextFieldProps extends InputProps {
  readonly label: string;
  /** Short help shown under the label, linked to the input for screen readers. */
  readonly hint?: string | undefined;
  /** Error text. When present the field is marked invalid and the text is announced. */
  readonly error?: string | undefined;
  /** Id of other content that describes the field, for example a checklist of requirements. */
  readonly describedBy?: string | undefined;
  /** The label stays for assistive technology but is not drawn (a table cell under its header). */
  readonly hideLabel?: boolean | undefined;
}

/**
 * Label above the field, always visible (ux-guidelines section 9). The error is linked with
 * `aria-describedby` and announced with `role="alert"` when it appears.
 */
export function TextField({
  label,
  hint,
  error,
  describedBy: extraDescription,
  hideLabel = false,
  className,
  ...input
}: TextFieldProps): JSX.Element {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [
    hint === undefined ? null : hintId,
    extraDescription ?? null,
    error === undefined ? null : errorId,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className={cn(styles.field)}>
      <label className={cn(styles.label, hideLabel && styles.hidden)} htmlFor={id}>
        {label}
      </label>
      {hint === undefined ? null : (
        <p id={hintId} className={cn(styles.hint)}>
          {hint}
        </p>
      )}
      <input
        {...input}
        id={id}
        className={cn(styles.input, className)}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy === '' ? undefined : describedBy}
      />
      {error === undefined ? null : (
        <p id={errorId} role="alert" className={cn(styles.error)}>
          {error}
        </p>
      )}
    </div>
  );
}
