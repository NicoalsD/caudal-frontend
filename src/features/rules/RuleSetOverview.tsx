import type { JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import type { RuleSetView } from '../../services/api/views';
import { cn } from '../../ui/styles/cn';
import { useSectors } from '../../state/hooks/useSectors';
import { buildSectorRows } from '../../core/rules/sectorOrder';
import { bandLabel, dayLabel, windowRangeLabel } from './ruleLabels';
import styles from './Rules.module.css';
import { TableScroll } from '../../ui/primitives/TableScroll';

interface RuleSetOverviewProps {
  readonly rules: RuleSetView;
}

const LEVEL_DIGITS = 2;

function yesNo(value: boolean): string {
  return value ? t('rules.yes') : t('rules.no');
}

/** Read-only view of one version: gauge range, bands, parameters and operating windows. */
export function RuleSetOverview({ rules }: RuleSetOverviewProps): JSX.Element {
  const level = (value: number): string => formatDecimal(value, LEVEL_DIGITS);
  const windows = [...rules.operatingWindows].sort(
    (a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0) || a.start.localeCompare(b.start),
  );

  return (
    <div className={cn(styles.stack)}>
      <section className={cn(styles.section)} aria-labelledby="rules-bands-title">
        <h2 id="rules-bands-title">{t('rules.bandsTitle')}</h2>
        <p>
          {t('rules.gaugeRange', {
            min: level(rules.gauge.min),
            max: level(rules.gauge.max),
          })}
        </p>
        <TableScroll label={t('rules.bandsCaption')} className={cn(styles.tableWrap)}>
          <table className={cn(styles.table)}>
            <caption>{t('rules.bandsCaption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('rules.bandName')}</th>
                <th scope="col">{t('rules.bandFrom')}</th>
                <th scope="col">{t('rules.bandTo')}</th>
                <th scope="col">{t('rules.bandHours')}</th>
                <th scope="col">{t('rules.bandPriorityOnly')}</th>
              </tr>
            </thead>
            <tbody>
              {[...rules.bands]
                .sort((a, b) => b.minLevel - a.minLevel)
                .map((band) => (
                  <tr key={band.band}>
                    <th scope="row">{bandLabel(band.band)}</th>
                    <td>{level(band.minLevel)}</td>
                    <td>{level(band.maxLevel)}</td>
                    <td>{formatDecimal(band.dailyServiceHours, LEVEL_DIGITS)}</td>
                    <td>{yesNo(band.priorityOnly)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableScroll>
        <p className={cn(styles.note)}>{t('rules.upperBandIncludesMax')}</p>
      </section>

      <section className={cn(styles.section)} aria-labelledby="rules-parameters-title">
        <h2 id="rules-parameters-title">{t('rules.parametersTitle')}</h2>
        <dl className={cn(styles.definitions)}>
          <dt>{t('rules.reserveLevel')}</dt>
          <dd>{level(rules.reserveLevel)}</dd>
          <dt>{t('rules.maxDailyServiceHours')}</dt>
          <dd>{formatDecimal(rules.maxDailyServiceHours, LEVEL_DIGITS)}</dd>
          <dt>{t('rules.minShiftHours')}</dt>
          <dd>{formatDecimal(rules.minShiftHours, LEVEL_DIGITS)}</dd>
          <dt>{t('rules.maxShiftHours')}</dt>
          <dd>{formatDecimal(rules.maxShiftHours, LEVEL_DIGITS)}</dd>
          <dt>{t('rules.staleReadingHours')}</dt>
          <dd>{formatDecimal(rules.staleReadingHours, 0)}</dd>
          <dt>{t('rules.trendThresholdPerDay')}</dt>
          <dd>{formatDecimal(rules.trendThresholdPerDay, LEVEL_DIGITS)}</dd>
        </dl>
      </section>

      <SectorsOverview rules={rules} />

      <section className={cn(styles.section)} aria-labelledby="rules-windows-title">
        <h2 id="rules-windows-title">{t('rules.windowsTitle')}</h2>
        {windows.length === 0 ? (
          <p>{t('rules.noWindows')}</p>
        ) : (
          <dl className={cn(styles.definitions)}>
            {windows.map((window) => (
              <div
                key={`${String(window.dayOfWeek)}-${window.start}`}
                className={cn(styles.definitionRow)}
              >
                <dt>{dayLabel(window.dayOfWeek)}</dt>
                <dd>{windowRangeLabel(window)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

/** Which sectors get shifts and which are priority, in the order they are attended. */
function SectorsOverview({ rules }: RuleSetOverviewProps): JSX.Element {
  const sectors = useSectors();
  const names = new Map((sectors.data ?? []).map((sector) => [sector.id, sector.name]));
  const rows = buildSectorRows(rules.sectors, []);
  const ranks = new Map(rules.sectors.map((setting) => [setting.sectorId, setting.priorityRank]));

  return (
    <section className={cn(styles.section)} aria-labelledby="rules-sectors-title">
      <h2 id="rules-sectors-title">{t('rules.sectorsOverviewTitle')}</h2>
      {rows.length === 0 ? (
        <p>{t('rules.noSectors')}</p>
      ) : (
        <ol className={cn(styles.sectorList)}>
          {rows.map((row) => {
            const rank = ranks.get(row.sectorId) ?? null;
            let state = t('rules.sectorNotPriority');
            if (!row.isIncluded) {
              state = t('rules.sectorExcluded');
            } else if (row.isPriority && rank !== null) {
              state = t('rules.sectorPriorityRank', { rank: String(rank) });
            }
            return (
              <li key={row.sectorId}>
                {names.get(row.sectorId) ?? t('rules.sectorUnknown')}
                {': '}
                {state}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
