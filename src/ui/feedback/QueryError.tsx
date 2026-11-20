import type { JSX } from 'react';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { ErrorState } from './ErrorState';
import { Button } from '../primitives/Button';

interface QueryErrorProps {
  readonly title: string;
  readonly error: unknown;
  readonly onRetry: () => void;
}

/** Error block of a screen whose data did not load, with the support code when the server fails. */
export function QueryError({ title, error, onRetry }: QueryErrorProps): JSX.Element {
  const text = errorText(error);
  return (
    <ErrorState
      title={title}
      message={text.supportCode === null ? text.message : `${text.message} ${text.supportCode}`}
      action={<Button onClick={onRetry}>{t('common.retry')}</Button>}
    />
  );
}
