import type { CSSProperties, JSX } from 'react';

import { t } from '../../i18n/t';
import { cn } from '../styles/cn';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** CSS width and height (token or length); the default is a text line. */
  readonly width?: string;
  readonly height?: string;
  readonly shape?: 'line' | 'block' | 'circle';
  readonly className?: string;
}

/** Loading placeholder. Decorative: the container that loads says "Cargando" once. */
export function Skeleton({ width, height, shape = 'line', className }: SkeletonProps): JSX.Element {
  const style: CSSProperties = {
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
  };
  return (
    <span
      aria-hidden="true"
      className={cn(styles.skeleton, styles[shape], className)}
      style={style}
    />
  );
}

interface SkeletonGroupProps {
  readonly children: JSX.Element | readonly JSX.Element[];
  readonly className?: string;
}

/** Wraps several skeletons in one polite status that says "Cargando". */
export function SkeletonGroup({ children, className }: SkeletonGroupProps): JSX.Element {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className={cn(styles.sr)}>{t('ui.loading')}</span>
      {children}
    </div>
  );
}
