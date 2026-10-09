import type { JSX } from 'react';
import { Link } from 'react-router';

import { strings } from '../../i18n/es';
import { useSession } from '../../state/hooks/useSession';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../routes';

export function ForbiddenPage(): JSX.Element {
  const session = useSession();
  const home =
    session.status === 'authenticated' ? HOME_PATH_BY_ROLE[session.user.role] : ROUTE_PATHS.root;

  return (
    <ErrorState
      title={strings.errors.forbiddenTitle}
      message={strings.errors.forbiddenBody}
      action={<Link to={home}>{strings.errors.goHome}</Link>}
    />
  );
}
