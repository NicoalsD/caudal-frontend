import { useId } from 'react';
import type { ComponentPropsWithRef, JSX } from 'react';

import { isNearLimit } from '../../core/format/counter';
import { cn } from '../styles/cn';
import styles from './TextAreaField.module.css';

const DEFAULT_ROWS = 4;

type AreaProps = Omit<
  ComponentPropsWithRef<'textarea'>,
  'id' | 'aria-invalid' | 'aria-describedby' | 'children' | 'maxLength'
>;

interface TextAreaFieldProps extends AreaProps {
  readonly label: string;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  /** Characters typed so far, to draw the counter. Controlled by the form. */
  readonly length: number;
  /** The maximum, from the server. The field does not cut the text: the counter and the error say it. */
  readonly maxLength: number;
  /** Builds "30 de 500 caracteres" (text comes from es.ts). */
  readonly counterText: (length: number, maxLength: number) => string;
}

/** Multi-line field with a visible label and a counter that warns near the maximum. */
export function TextAreaField({
  label,
  hint,
  error,
  length,
  maxLength,
  counterText,
  className,
  ...area
}: TextAreaFieldProps): JSX.Element {
  const id = useId();
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const near = isNearLimit(length, maxLength);
  const describedBy = [
    hint === undefined ? null : hintId,
    counterId,
    error === undefined ? null : errorId,
  ]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className={cn(styles.field)}>
      <label className={cn(styles.label)} htmlFor={id}>
        {label}
      </label>
      {hint === undefined ? null : (
        <p id={hintId} className={cn(styles.hint)}>
          {hint}
        </p>
      )}
      <textarea
        {...area}
        id={id}
        rows={area.rows ?? DEFAULT_ROWS}
        className={cn(styles.area, className)}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy}
      />
      <p id={counterId} className={cn(styles.counter, near && styles.near)}>
        {counterText(length, maxLength)}
      </p>
      {error === undefined ? null : (
        <p id={errorId} role="alert" className={cn(styles.error)}>
          {error}
        </p>
      )}
    </div>
  );
}
