import type { JSX } from 'react';
import { Link } from 'react-router';

import { strings } from '../../i18n/es';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { ROUTE_PATHS } from '../routes';

export function NotFoundPage(): JSX.Element {
  return (
    <ErrorState
      title={strings.errors.notFoundTitle}
      message={strings.errors.notFoundBody}
      action={<Link to={ROUTE_PATHS.root}>{strings.errors.goHome}</Link>}
    />
  );
}
