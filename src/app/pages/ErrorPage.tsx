import type { JSX } from 'react';

import { strings } from '../../i18n/es';
import { ErrorState } from '../../ui/feedback/ErrorState';

/** Global error boundary page. It never shows stack traces or internal details. */
export function ErrorPage(): JSX.Element {
  return (
    <ErrorState title={strings.errors.unexpectedTitle} message={strings.errors.unexpectedBody} />
  );
}
