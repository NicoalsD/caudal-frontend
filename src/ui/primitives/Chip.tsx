import { Check, ChevronDown } from 'lucide-react';
import type { JSX, ReactNode } from 'react';

import { cn } from '../styles/cn';
import styles from './Chip.module.css';
import { Popover } from './Popover';

export type ChipTone = 'plain' | 'aqua' | 'mint' | 'sand' | 'coral' | 'lavender';

interface ChipProps {
  readonly tone?: ChipTone;
  /** Optional leading icon, already `aria-hidden`. */
  readonly icon?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Static pill with a short fact ("120 puntos", "Sector Norte"). */
export function Chip({ tone = 'plain', icon, children, className }: ChipProps): JSX.Element {
  return (
    <span className={cn(styles.chip, styles[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

interface FilterChipProps {
  /** What is filtered ("Estado"); read before the chosen option by assistive technology. */
  readonly label: string;
  readonly options: readonly FilterOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/** Pill with a menu of options (single choice), like "24h" or "Más recientes" above a table. */
export function FilterChip({
  label,
  options,
  value,
  onChange,
  className,
}: FilterChipProps): JSX.Element {
  const current = options.find((option) => option.value === value);
  return (
    <Popover
      label={label}
      className={className}
      renderTrigger={(trigger) => (
        <button type="button" {...trigger} className={cn(styles.chip, styles.filter)}>
          <span className={cn(styles.filterLabel)}>{label}</span>
          <span>{current?.label ?? value}</span>
          <ChevronDown aria-hidden="true" className={cn(styles.chevron)} />
        </button>
      )}
    >
      {(close) => (
        <ul className={cn(styles.options)}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={cn(styles.option)}
                aria-pressed={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                {option.label}
                {option.value === value && (
                  <Check aria-hidden="true" className={cn(styles.check)} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
