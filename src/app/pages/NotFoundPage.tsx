import type { JSX } from 'react';
import { Link } from 'react-router';

import { t } from '../../i18n/t';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { ROUTE_PATHS } from '../routes';

export function NotFoundPage(): JSX.Element {
  return (
    <ErrorState
      title={t('errors.notFoundTitle')}
      message={t('errors.notFoundBody')}
      action={<Link to={ROUTE_PATHS.root}>{t('errors.goHome')}</Link>}
    />
  );
}
