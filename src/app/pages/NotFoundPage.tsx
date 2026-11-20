import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { ROUTE_PATHS } from '../../core/session/routes';

export function NotFoundPage(): JSX.Element {
  return (
    <ErrorState
      title={t('errors.notFoundTitle')}
      message={t('errors.notFoundBody')}
      action={
        <LinkButton variant="primary" to={ROUTE_PATHS.root}>
          {t('errors.goHome')}
        </LinkButton>
      }
    />
  );
}
