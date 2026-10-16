import { useEffect, useRef } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';

interface ScreenTitleProps {
  readonly children: string;
}

/**
 * The single h1 of a screen. It takes focus on mount so keyboard and screen reader users land on it,
 * and names the browser tab after it (React hoists the title into the head).
 */
export function ScreenTitle({ children }: ScreenTitleProps): JSX.Element {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <>
      <title>{t('app.documentTitle', { screen: children })}</title>
      <h1 ref={ref} tabIndex={-1}>
        {children}
      </h1>
    </>
  );
}
