import type { JSX, ReactNode } from 'react';

import { strings } from '../../i18n/es';
import { cn } from '../../ui/styles/cn';
import styles from './Frames.module.css';

/** The "Datos simulados" mark every sample screen carries. */
export function SimulatedTag({ className }: { readonly className?: string }): JSX.Element {
  return <span className={cn(styles.simulated, className)}>{strings.common.simulatedData}</span>;
}

/** A phone drawn in CSS around a real screen of the app (AppScreen). */
export function PhoneFrame({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  return (
    <div className={cn(styles.phone, className)}>
      <div className={cn(styles.phoneScreen)}>{children}</div>
    </div>
  );
}
