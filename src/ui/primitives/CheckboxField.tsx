import type { ComponentPropsWithRef, JSX } from 'react';

import { cn } from '../styles/cn';
import styles from './CheckboxField.module.css';

interface CheckboxFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  readonly label: string;
}

/** A checkbox with a visible label, big enough to touch (the whole row is the target). */
export function CheckboxField({ label, className, ...input }: CheckboxFieldProps): JSX.Element {
  return (
    <label className={cn(styles.field)}>
      <input {...input} type="checkbox" className={cn(styles.box, className)} />
      <span>{label}</span>
    </label>
  );
}
