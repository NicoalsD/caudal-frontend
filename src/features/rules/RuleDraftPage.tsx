import type { JSX } from 'react';
import { Link, useParams } from 'react-router';

import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import { usePermission } from '../../state/hooks/usePermission';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import { DraftEditor } from './DraftEditor';
import { QueryError } from './QueryStates';
import { RuleSetOverview } from './RuleSetOverview';
import styles from './Rules.module.css';
import { statusLabel } from './ruleLabels';
import { useRuleSet } from './ruleQueries';

/** Screen S16 for one version: a draft is edited here; any other version is read-only. */
export function RuleDraftPage(): JSX.Element {
  const { id = '' } = useParams();
  const query = useRuleSet(id);
  const canEdit = usePermission('RULESET_DRAFT');

  if (query.isPending) {
    return <LoadingState message={t('rules.loading')} />;
  }
  if (query.isError) {
    return (
      <QueryError
        title={t('screens.ruleDetail')}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const rules = query.data;
  const isDraft = rules.status === 'DRAFT';

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>
        {isDraft
          ? t('rules.draftPageTitle', { version: String(rules.version) })
          : t('rules.versionPageTitle', { version: String(rules.version) })}
      </ScreenTitle>
      <p>
        <span className={cn(styles.status)}>{statusLabel(rules.status)}</span>
      </p>
      {isDraft ? null : <p>{t('rules.notEditable')}</p>}
      {isDraft && canEdit ? (
        <DraftEditor key={rules.id} rules={rules} />
      ) : (
        <>
          {isDraft ? <p>{t('rules.readOnlyNotice')}</p> : null}
          <RuleSetOverview rules={rules} />
        </>
      )}
      <Link to={ROUTE_PATHS.board.rules}>{t('rules.backToRules')}</Link>
    </div>
  );
}
