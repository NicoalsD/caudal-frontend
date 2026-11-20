import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { useSession } from '../../state/hooks/useSession';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { LinkButton } from '../../ui/primitives/LinkButton';
import { HOME_PATH_BY_ROLE, ROUTE_PATHS } from '../../core/session/routes';
import { StandaloneSheet } from './StandaloneSheet';

export function ForbiddenPage(): JSX.Element {
  const session = useSession();
  const home =
    session.status === 'authenticated' ? HOME_PATH_BY_ROLE[session.user.role] : ROUTE_PATHS.root;

  return (
    <StandaloneSheet>
      <ErrorState
        title={t('errors.forbiddenTitle')}
        message={t('errors.forbiddenBody')}
        action={
          <LinkButton variant="primary" to={home}>
            {t('errors.goHome')}
          </LinkButton>
        }
      />
    </StandaloneSheet>
  );
}
