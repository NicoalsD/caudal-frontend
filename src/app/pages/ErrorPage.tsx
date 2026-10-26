import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { ErrorState } from '../../ui/feedback/ErrorState';

/** Global error boundary page. It never shows stack traces or internal details. */
export function ErrorPage(): JSX.Element {
  return <ErrorState title={t('errors.unexpectedTitle')} message={t('errors.unexpectedBody')} />;
}
