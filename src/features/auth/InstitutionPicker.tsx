import { useId, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { filterInstitutions, preselectedSlug } from '../../core/institutions/institutionChoice';
import { t } from '../../i18n/t';
import { Button } from '../../ui/primitives/Button';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { TextField } from '../../ui/primitives/TextField';
import { cn } from '../../ui/styles/cn';
import styles from './InstitutionPicker.module.css';
import { useRememberedInstitution } from '../../state/hooks/useRememberedInstitution';
import { credentialsPathFor } from './loginPaths';
import { useInstitutionDirectory } from './institutionQueries';

const NEXT_PARAM = 'next';

interface InstitutionPickerProps {
  /** Slug that came from a link but is not in the directory, shown as a notice. */
  readonly unknownSlug: string | null;
}

/**
 * First step of the sign in ("Elige tu institución"): a search and the list of the public
 * directory. Confirming opens the credentials step at `/i/{slug}/login`.
 */
export function InstitutionPicker({ unknownSlug }: InstitutionPickerProps): JSX.Element {
  const directory = useInstitutionDirectory();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const groupName = useId();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [remembered] = useRememberedInstitution();

  const next = params.get(NEXT_PARAM);
  const items = directory.data ?? [];
  const visible = filterInstitutions(items, query);
  const chosen = picked ?? preselectedSlug(items, remembered);
  const selected = visible.find((item) => item.slug === chosen);

  return (
    <>
      <ScreenTitle>{t('auth.institution.title')}</ScreenTitle>
      <p className={cn(styles.intro)}>{t('auth.institution.intro')}</p>
      {unknownSlug === null ? null : (
        <p role="status" className={cn(styles.notice)}>
          {t('auth.institution.unknownSlug')}
        </p>
      )}
      {directory.isPending ? <LoadingState message={t('auth.institution.loading')} /> : null}
      {directory.isError ? (
        <div className={cn(styles.retry)}>
          <FormAlert message={t('auth.institution.loadError')} />
          <Button
            variant="secondary"
            className={cn(styles.retryButton)}
            onClick={() => {
              void directory.refetch();
            }}
          >
            {t('auth.institution.retry')}
          </Button>
        </div>
      ) : null}
      {directory.isSuccess ? (
        <form
          className={cn(styles.form)}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (selected !== undefined) {
              void navigate(credentialsPathFor(selected.slug, next));
            }
          }}
        >
          {items.length === 0 ? null : (
            <TextField
              type="search"
              label={t('auth.institution.searchLabel')}
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          )}
          {items.length === 0 ? (
            <p role="status" className={cn(styles.empty)}>
              {t('auth.institution.empty')}
            </p>
          ) : null}
          {items.length > 0 && visible.length === 0 ? (
            <p role="status" className={cn(styles.empty)}>
              {t('auth.institution.noMatch')}
            </p>
          ) : null}
          {visible.length === 0 ? null : (
            <fieldset className={cn(styles.list)}>
              <legend className={cn(styles.legend)}>{t('auth.institution.listLabel')}</legend>
              {visible.map((item) => (
                <label key={item.slug} className={cn(styles.option)}>
                  <input
                    type="radio"
                    name={groupName}
                    value={item.slug}
                    checked={selected?.slug === item.slug}
                    onChange={() => {
                      setPicked(item.slug);
                    }}
                    className={cn(styles.radio)}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </fieldset>
          )}
          {items.length === 0 ? null : (
            <Button
              type="submit"
              variant="primary"
              className={cn(styles.submit)}
              disabled={selected === undefined}
            >
              {t('auth.institution.continue')}
            </Button>
          )}
        </form>
      ) : null}
    </>
  );
}
