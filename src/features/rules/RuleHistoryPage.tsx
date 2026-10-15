import { useMemo, useState } from 'react';
import type { ChangeEvent, JSX } from 'react';
import { Link, useParams } from 'react-router';

import { defaultComparison, diffRules } from '../../core/rules/ruleHistory';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import type { RuleSetSummaryView, RuleSetView } from '../../services/api/views';
import { useSectors } from '../../state/hooks/useSectors';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { QueryError } from '../../ui/feedback/QueryError';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { cn } from '../../ui/styles/cn';
import styles from './Rules.module.css';
import { statusLabel } from './ruleLabels';
import { useRuleVersionDetails, useRuleVersions, useValveCodes } from './ruleQueries';
import { changeLabel, changeValueText } from './ruleHistoryText';
import type { ChangeNames } from './ruleHistoryText';

/** Versions that were in force: a draft or a discarded version is not part of the history. */
function isHistoryStatus(status: RuleSetSummaryView['status']): boolean {
  return status === 'ACTIVE' || status === 'SUPERSEDED';
}

function versionPath(id: string): string {
  return ROUTE_PATHS.board.ruleDetail.replace(':id', encodeURIComponent(id));
}

/** Screen S17: the versions in force, and the plain-language differences between two of them. */
export function RuleHistoryPage(): JSX.Element {
  const { id = '' } = useParams();
  const versions = useRuleVersions();
  const history = useMemo(
    () => (versions.data ?? []).filter((item) => isHistoryStatus(item.status)),
    [versions.data],
  );
  const details = useRuleVersionDetails(history.map((item) => item.id));
  const sectors = useSectors();
  const valveCodes = useValveCodes();
  const [chosen, setChosen] = useState<{ readonly before: string; readonly after: string } | null>(
    null,
  );

  if (versions.isPending) {
    return (
      <>
        <ScreenTitle>{t('screens.ruleHistory')}</ScreenTitle>
        <LoadingState message={t('ruleHistory.loading')} />
      </>
    );
  }
  if (versions.isError) {
    return (
      <>
        <ScreenTitle>{t('screens.ruleHistory')}</ScreenTitle>
        <QueryError
          title={t('screens.ruleHistory')}
          error={versions.error}
          onRetry={() => void versions.refetch()}
        />
      </>
    );
  }

  const byId = new Map<string, RuleSetView>();
  for (const query of details) {
    if (query.data !== undefined) {
      byId.set(query.data.id, query.data);
    }
  }
  const defaults = defaultComparison(history, id);
  const afterId = chosen?.after ?? defaults?.after.id ?? '';
  const beforeId = chosen?.before ?? defaults?.before?.id ?? '';
  const before = byId.get(beforeId);
  const after = byId.get(afterId);
  const names = {
    sectors: new Map((sectors.data ?? []).map((sector) => [sector.id, sector.name])),
    valves: valveCodes,
  };

  const choose = (field: 'before' | 'after') => (event: ChangeEvent<HTMLSelectElement>) => {
    setChosen({ before: beforeId, after: afterId, [field]: event.target.value });
  };

  return (
    <div className={cn(styles.stack)}>
      <ScreenTitle>{t('screens.ruleHistory')}</ScreenTitle>
      {history.length === 0 ? (
        <p>{t('ruleHistory.empty')}</p>
      ) : (
        <>
          <section className={cn(styles.section)} aria-labelledby="history-versions-title">
            <h2 id="history-versions-title">{t('ruleHistory.versionsTitle')}</h2>
            <ol className={cn(styles.versionList)} aria-labelledby="history-versions-title">
              {history.map((item) => (
                <VersionItem key={item.id} summary={item} rules={byId.get(item.id)} />
              ))}
            </ol>
          </section>

          <section className={cn(styles.section)} aria-labelledby="history-compare-title">
            <h2 id="history-compare-title">{t('ruleHistory.compareTitle')}</h2>
            <div className={cn(styles.pair)}>
              <VersionSelect
                label={t('ruleHistory.before')}
                value={beforeId}
                versions={history}
                onChange={choose('before')}
              />
              <VersionSelect
                label={t('ruleHistory.after')}
                value={afterId}
                versions={history}
                onChange={choose('after')}
              />
            </div>
            <Comparison
              before={before}
              after={after}
              hasBefore={beforeId !== ''}
              failed={details.some((query) => query.isError)}
              names={names}
            />
          </section>
        </>
      )}
      <Link to={ROUTE_PATHS.board.rules}>{t('rules.backToRules')}</Link>
    </div>
  );
}

function VersionItem({
  summary,
  rules,
}: {
  readonly summary: RuleSetSummaryView;
  readonly rules: RuleSetView | undefined;
}): JSX.Element {
  const since = summary.activatedAt ?? summary.validFrom;
  return (
    <li className={cn(styles.versionItem)}>
      <p className={cn(styles.versionTitle)}>
        <strong>{t('rules.versionLine', { version: String(summary.version) })}</strong>{' '}
        <span className={cn(styles.status)}>{statusLabel(summary.status)}</span>
      </p>
      {since === null ? null : <p>{t('ruleHistory.activeSince', { date: since.text })}</p>}
      {rules === undefined ? null : (
        <p>
          {rules.changeReason === null || rules.changeReason === ''
            ? t('ruleHistory.noReason')
            : t('ruleHistory.reason', { reason: rules.changeReason })}
        </p>
      )}
      <Link to={versionPath(summary.id)}>{t('ruleHistory.viewVersion')}</Link>
    </li>
  );
}

function VersionSelect({
  label,
  value,
  versions,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly versions: readonly RuleSetSummaryView[];
  readonly onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}): JSX.Element {
  return (
    <label className={cn(styles.pairField)}>
      {label}
      <select className={cn(styles.select)} value={value} onChange={onChange}>
        {value === '' ? <option value="">{t('ruleHistory.chooseVersion')}</option> : null}
        {versions.map((item) => (
          <option key={item.id} value={item.id}>
            {t('rules.versionLine', { version: String(item.version) })}
          </option>
        ))}
      </select>
    </label>
  );
}

interface ComparisonProps {
  readonly before: RuleSetView | undefined;
  readonly after: RuleSetView | undefined;
  readonly hasBefore: boolean;
  /** A version could not be read: the comparison says so instead of waiting for it. */
  readonly failed: boolean;
  readonly names: ChangeNames;
}

function Comparison({ before, after, hasBefore, failed, names }: ComparisonProps): JSX.Element {
  if (!hasBefore) {
    return <p>{t('ruleHistory.firstVersion')}</p>;
  }
  if (failed) {
    return <p role="alert">{t('ruleHistory.loadError')}</p>;
  }
  if (before === undefined || after === undefined) {
    return <LoadingState message={t('ruleHistory.loadingDiff')} />;
  }
  const changes = diffRules(before, after);
  if (changes.length === 0) {
    return <p>{t('ruleHistory.noChanges')}</p>;
  }
  return (
    <div className={cn(styles.tableWrap)}>
      <table className={cn(styles.table)}>
        <caption>{t('ruleHistory.diffTitle')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('ruleHistory.parameter')}</th>
            <th scope="col">{t('ruleHistory.before')}</th>
            <th scope="col">{t('ruleHistory.after')}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, index) => (
            <tr key={`${change.area}-${change.subject}-${change.field}-${index}`}>
              <th scope="row">{changeLabel(change, names)}</th>
              <td>{changeValueText(change, change.before)}</td>
              <td>{changeValueText(change, change.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
