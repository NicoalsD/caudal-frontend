import { useId } from 'react';
import type { ComponentPropsWithRef, JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './RadioGroupField.module.css';

export interface RadioOption {
  readonly value: string;
  readonly label: string;
}

type InputProps = Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'value' | 'children' | 'id' | 'aria-invalid' | 'aria-describedby'
>;

interface RadioGroupFieldProps extends InputProps {
  readonly legend: string;
  readonly options: readonly RadioOption[];
  readonly error?: string | undefined;
}

/**
 * A group of big radio buttons with a visible legend. Each option is a touch target of the
 * height of a field. The error is linked to the group and announced when it appears.
 */
export function RadioGroupField({
  legend,
  options,
  error,
  ...input
}: RadioGroupFieldProps): JSX.Element {
  const errorId = `${useId()}-error`;
  return (
    <fieldset
      className={cn(styles.group)}
      aria-invalid={error === undefined ? undefined : true}
      aria-describedby={error === undefined ? undefined : errorId}
    >
      <legend className={cn(styles.legend)}>{legend}</legend>
      <div className={cn(styles.options)}>
        {options.map((option) => (
          <label key={option.value} className={cn(styles.option)}>
            <input {...input} type="radio" value={option.value} className={cn(styles.radio)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error === undefined ? null : (
        <p id={errorId} role="alert" className={cn(styles.error)}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
