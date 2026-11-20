import { useContext, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { createPortal } from 'react-dom';

import { t } from '../../i18n/t';
import { PageTitleSlotContext } from './pageTitleSlot';

interface ScreenTitleProps {
  readonly children: string;
}

/**
 * The single h1 of a screen. It takes focus on mount so keyboard and screen reader users land on it,
 * and names the browser tab after it (React hoists the title into the head). Inside the app shell it
 * is drawn in the top bar, next to the search and the user menu.
 */
export function ScreenTitle({ children }: ScreenTitleProps): JSX.Element {
  const ref = useRef<HTMLHeadingElement>(null);
  const slot = useContext(PageTitleSlotContext);
  useEffect(() => {
    ref.current?.focus();
  }, [slot]);
  const heading = (
    <h1 ref={ref} tabIndex={-1}>
      {children}
    </h1>
  );
  return (
    <>
      <title>{t('app.documentTitle', { screen: children })}</title>
      {slot === null ? heading : createPortal(heading, slot)}
    </>
  );
}
