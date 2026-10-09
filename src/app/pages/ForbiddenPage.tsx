import type { JSX } from 'react';
import { Link } from 'react-router';

import { t } from '../../i18n/t';
import { useSession } from '../../state/hooks/useSession';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../routes';

export function ForbiddenPage(): JSX.Element {
  const session = useSession();
  const home =
    session.status === 'authenticated' ? HOME_PATH_BY_ROLE[session.user.role] : ROUTE_PATHS.root;

  return (
    <ErrorState
      title={t('errors.forbiddenTitle')}
      message={t('errors.forbiddenBody')}
      action={<Link to={home}>{t('errors.goHome')}</Link>}
    />
  );
}
