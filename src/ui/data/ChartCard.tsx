import type { JSX, ReactNode } from 'react';

import { t } from '../../i18n/t';
import { Card } from '../cards/Card';
import { TextTabs } from '../primitives/TextTabs';
import { cn } from '../styles/cn';
import styles from './ChartCard.module.css';

export interface RangeOption {
  readonly id: string;
  readonly label: string;
}

interface ChartCardProps {
  readonly title: string;
  /** The headline figure ("2,4 m"), already formatted. */
  readonly value?: ReactNode;
  readonly caption?: string;
  readonly ranges?: readonly RangeOption[];
  readonly range?: string;
  readonly onRangeChange?: (id: string) => void;
  /** The chart. Pass `AreaTrend` or any chart with a text summary. */
  readonly children: ReactNode;
  readonly className?: string;
}

/** Hero card for one chart: title and figure at the left, text range selector at the right. */
export function ChartCard({
  title,
  value,
  caption,
  ranges,
  range,
  onRangeChange,
  children,
  className,
}: ChartCardProps): JSX.Element {
  const selector =
    ranges !== undefined && range !== undefined && onRangeChange !== undefined ? (
      <TextTabs
        label={t('ui.rangeLabel')}
        tabs={ranges}
        value={range}
        onChange={onRangeChange}
        idPrefix={`range-${title.replace(/\s+/g, '-').toLowerCase()}`}
      />
    ) : null;
  return (
    <Card
      variant="tinted"
      tint="hero"
      as="section"
      aria-label={title}
      className={cn(styles.card, className)}
    >
      <header className={cn(styles.head)}>
        <div>
          <h2 className={cn(styles.title)}>{title}</h2>
          {value !== undefined && <p className={cn(styles.value)}>{value}</p>}
          {caption !== undefined && <p className={cn(styles.caption)}>{caption}</p>}
        </div>
        {selector}
      </header>
      {children}
    </Card>
  );
}
