import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { ErrorState } from '../../ui/feedback/ErrorState';
import { Button } from '../../ui/primitives/Button';
import { StandaloneSheet } from './StandaloneSheet';

/**
 * Global error boundary page. It never shows stack traces or internal details. Reloading is the way
 * out: it also recovers a screen whose chunk could not be downloaded (weak signal, new version).
 */
export function ErrorPage(): JSX.Element {
  return (
    <StandaloneSheet>
      <ErrorState
        title={t('errors.unexpectedTitle')}
        message={t('errors.unexpectedBody')}
        action={
          <Button
            variant="primary"
            onClick={() => {
              window.location.reload();
            }}
          >
            {t('errors.reload')}
          </Button>
        }
      />
    </StandaloneSheet>
  );
}
