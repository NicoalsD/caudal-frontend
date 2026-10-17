import type { JSX, ReactNode } from 'react';

interface TableScrollProps {
  /** Name of the region, usually the caption of the table inside. */
  readonly label: string;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/**
 * Wrapper of a table that may scroll sideways on a narrow screen. It is a named region that takes
 * keyboard focus, so people who do not use a mouse can scroll it with the arrow keys (WCAG 2.1.1).
 */
export function TableScroll({ label, className, children }: TableScrollProps): JSX.Element {
  return (
    // A scrollable region must be reachable by keyboard; this is the pattern axe asks for.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div role="region" aria-label={label} tabIndex={0} className={className}>
      {children}
    </div>
  );
}
