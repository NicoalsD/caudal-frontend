import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';

interface PlaceholderPageProps {
  readonly title: string;
}

/** Stand-in for screens that later phases build inside src/features. */
export function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <>
      <ScreenTitle>{title}</ScreenTitle>
      <p>{t('app.comingSoon')}</p>
    </>
  );
}
