import { useState } from 'react';
import type { JSX } from 'react';
import { useNavigate } from 'react-router';

import { DomainError } from '../../core/errors/DomainError';
import { HOME_PATH_BY_ROLE } from '../../core/session/routes';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useSession } from '../../state/hooks/useSession';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { CheckboxField } from '../../ui/primitives/CheckboxField';
import { cn } from '../../ui/styles/cn';
import styles from './PrivacyNoticePage.module.css';
import { useAcceptPrivacyNotice, usePrivacyNotice } from './privacyQueries';

const CONFLICT = 'CONFLICT';
const CURRENT_VERSION = 'current_version';
/** A blank line separates paragraphs in the notice text. */
const PARAGRAPH_BREAK = /\n\s*\n/;

/** The notice as plain paragraphs: React escapes every character, the text is never HTML. */
function paragraphsOf(text: string): readonly string[] {
  return text
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}

/**
 * Screen S03: the privacy notice in force and its acceptance. Until it is accepted the rest of the
 * app stays closed (RequirePrivacyAccepted); accepting opens it.
 */
export function PrivacyNoticePage(): JSX.Element {
  const session = useSession();
  const notice = usePrivacyNotice();
  const accept = useAcceptPrivacyNotice();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (session.status !== 'authenticated') {
    return <LoadingState message={t('privacy.loading')} />;
  }
  if (notice.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.privacyNotice')}</ScreenTitle>
        <LoadingState message={t('privacy.loading')} />
      </>
    );
  }
  if (notice.isError) {
    return (
      <QueryError
        title={t('screens.privacyNotice')}
        error={notice.error}
        onRetry={() => {
          void notice.refetch();
        }}
      />
    );
  }

  const current = notice.data;
  const submit = (): void => {
    setFailure(null);
    accept.mutate(current.version, {
      onSuccess: () => {
        void navigate(HOME_PATH_BY_ROLE[session.user.role], { replace: true });
      },
      onError: (error: unknown) => {
        if (
          error instanceof DomainError &&
          error.code === CONFLICT &&
          CURRENT_VERSION in error.details
        ) {
          void notice.refetch();
          setChecked(false);
          setFailure(t('privacy.changed'));
          return;
        }
        setFailure(errorText(error).message);
      },
    });
  };

  return (
    <>
      <ScreenTitle>{t('screens.privacyNotice')}</ScreenTitle>
      <p>{t('privacy.lead')}</p>
      <h2>{t('privacy.version', { version: String(current.version) })}</h2>
      <div className={cn(styles.text)}>
        {paragraphsOf(current.text).map((paragraph, index) => (
          <p key={index} className={cn(styles.paragraph)}>
            {paragraph}
          </p>
        ))}
      </div>
      <form
        className={cn(styles.form)}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        noValidate
        aria-busy={accept.isPending}
      >
        {failure === null ? null : <FormAlert message={failure} />}
        <CheckboxField
          label={t('privacy.acceptLabel')}
          checked={checked}
          disabled={accept.isPending}
          onChange={(event) => {
            setChecked(event.target.checked);
          }}
        />
        <Button type="submit" variant="primary" disabled={!checked || accept.isPending}>
          {accept.isPending ? t('privacy.submitting') : t('privacy.submit')}
        </Button>
      </form>
    </>
  );
}
