import { useId } from 'react';
import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './SegmentedControl.module.css';

export interface SegmentOption {
  readonly value: string;
  readonly label: string;
  /** Optional icon, already `aria-hidden`. */
  readonly icon?: ReactNode;
}

interface SegmentedControlProps {
  /** Names the group ("Periodo"). */
  readonly label: string;
  readonly options: readonly SegmentOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly size?: 'md' | 'sm';
  readonly className?: string;
}

/**
 * Pill with two to four exclusive choices ("Hoy / Semana / Mes"). It is a native radio group:
 * Tab enters it, the arrow keys move and select, and screen readers say "1 of 3".
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps): JSX.Element {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn(styles.root, styles[size], className)}>
      {options.map((option) => (
        <label key={option.value} className={cn(styles.option)}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            className={cn(styles.input)}
            onChange={() => {
              onChange(option.value);
            }}
          />
          <span className={cn(styles.face)}>
            {option.icon}
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
