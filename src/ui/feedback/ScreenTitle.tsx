import { useEffect, useRef } from 'react';
import type { JSX } from 'react';

interface ScreenTitleProps {
  readonly children: string;
}

/** The single h1 of a screen. It takes focus on mount so keyboard and screen reader users land on it. */
export function ScreenTitle({ children }: ScreenTitleProps): JSX.Element {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
}
