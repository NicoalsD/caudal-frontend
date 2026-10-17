import type { JSX } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { DomainError } from '../../core/errors/DomainError';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { Button } from '../../ui/primitives/Button';
import { QueryError } from '../../ui/feedback/QueryError';
import { RuleSetOverview } from './RuleSetOverview';
import styles from './Rules.module.css';
import { useCreateDraft, useOpenDraft } from './ruleQueries';
import { cn } from '../../ui/styles/cn';

const NOT_FOUND_CODE = 'NOT_FOUND';

/** The activation dialog sends the person back here saying which version it activated. */
function readActivatedVersion(state: unknown): number | null {
  if (typeof state !== 'object' || state === null || !('activatedVersion' in state)) {
    return null;
  }
  const version = state.activatedVersion;
  return typeof version === 'number' ? version : null;
}

function historyPath(id: string): string {
  return ROUTE_PATHS.board.ruleHistory.replace(':id', encodeURIComponent(id));
}

function draftPath(id: string): string {
  return ROUTE_PATHS.board.ruleDetail.replace(':id', encodeURIComponent(id));
}

/** Screen S16, first half: the rules in force and the way into the draft. */
export function RulesPage(): JSX.Element {
  const current = useCurrentRuleSet();
  const draft = useOpenDraft();
  const createDraft = useCreateDraft();
  const canDraft = usePermission('RULESET_DRAFT');
  const navigate = useNavigate();
  const location = useLocation();
  const activatedVersion = readActivatedVersion(location.state);

  const create = (): void => {
    createDraft.mutate(undefined, {
      onSuccess: (created) => {
        void navigate(draftPath(created.id));
      },
    });
  };

  let body: JSX.Element;
  if (current.isPending) {
    body = <LoadingState message={t('rules.loading')} />;
  } else if (current.isError) {
    body =
      current.error instanceof DomainError && current.error.code === NOT_FOUND_CODE ? (
        <p>{t('rules.noActiveRules')}</p>
      ) : (
        <QueryError
          title={t('screens.rules')}
          error={current.error}
          onRetry={() => void current.refetch()}
        />
      );
  } else {
    body = (
      <>
        <p>
          <span className={cn(styles.status)}>{t('rules.status.active')}</span>{' '}
          {t('rules.versionLine', { version: String(current.data.version) })}
          {current.data.validFrom === null
            ? null
            : `. ${t('rules.activeSince', { date: current.data.validFrom.text })}`}
        </p>
        <RuleSetOverview rules={current.data} />
        <p>
          <Link to={historyPath(current.data.id)}>{t('rules.viewHistory')}</Link>
        </p>
      </>
    );
  }

  const openDraft = draft.data ?? null;
  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.rules')}</ScreenTitle>
      {activatedVersion === null ? null : (
        <p role="status">{t('rules.activated', { version: String(activatedVersion) })}</p>
      )}
      {body}
      <section className={cn(styles.section)} aria-labelledby="rules-draft-title">
        <h2 id="rules-draft-title">{t('rules.draftTitle')}</h2>
        {openDraft === null ? (
          <p>{canDraft ? t('rules.noDraft') : t('rules.noDraftReadOnly')}</p>
        ) : (
          <>
            <p>{t('rules.draftOpen', { version: String(openDraft.version) })}</p>
            <Link to={draftPath(openDraft.id)}>{t('rules.editDraft')}</Link>
          </>
        )}
        {createDraft.isError ? (
          <QueryError title={t('rules.draftTitle')} error={createDraft.error} onRetry={create} />
        ) : null}
        {openDraft === null && canDraft && !draft.isPending ? (
          <div className={cn(styles.actions)}>
            <Button variant="primary" onClick={create} disabled={createDraft.isPending}>
              {createDraft.isPending ? t('rules.creatingDraft') : t('rules.createDraft')}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
