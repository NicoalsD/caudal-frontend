import type { JSX } from 'react';

import { reserveDays } from '../../core/autopilot/reserveDays';
import { formatDecimal } from '../../core/format/decimal';
import { coverageByRegion } from '../../core/reports/regionCoverage';
import { lastDays, reportInstants, WEEK_DAYS } from '../../core/reports/reportPeriod';
import { levelFraction } from '../../core/scene/flow';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { usePermission } from '../../state/hooks/usePermission';
import { useReport } from '../../state/hooks/useReports';
import { useSectors } from '../../state/hooks/useSectors';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { cn } from '../../ui/styles/cn';
import { useIncidents } from '../incidents/incidentQueries';
import type { ConsoleContext } from '../tank-status';
import styles from './BoardOverview.module.css';

const LEVEL_DIGITS = 2;
const WHOLE = 0;
const PERCENT = 100;
const SINGLE_DAY = 1;
const CLOSED_STATUSES: readonly string[] = ['RESOLVED', 'DISMISSED'];
const REPORT_PERMISSION = 'REPORT_VIEW';
const INCIDENT_PERMISSION = 'INCIDENT_READ';

function Kpi({
  id,
  title,
  hint,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly hint?: string;
  readonly children: JSX.Element | JSX.Element[];
}): JSX.Element {
  return (
    <section className={cn(styles.kpi)} aria-labelledby={id}>
      <h2 id={id} className={cn(styles.kpiTitle)}>
        {title}
      </h2>
      {children}
      {hint === undefined ? null : <p className={cn(styles.hint)}>{hint}</p>}
    </section>
  );
}

/**
 * The first row of the Board's console (ISA-101 level 1): few big numbers. The level and its
 * band, the days of reserve by the median forecast, the week's coverage by region and the open
 * incidents. A figure the person has no permission to read is left out, not shown empty.
 */
export function BoardKpis({ tank, status }: ConsoleContext): JSX.Element {
  return (
    <div className={cn(styles.kpis)} role="group" aria-label={t('board.kpis.label')}>
      <LevelKpi tank={tank} status={status} />
      <ReserveKpi tank={tank} status={status} />
      <CoverageKpi />
      <IncidentsKpi />
    </div>
  );
}

function LevelKpi({ tank, status }: ConsoleContext): JSX.Element {
  const level = status.level?.value.value ?? null;
  return (
    <Kpi id="kpi-level" title={t('board.kpis.level')}>
      {level === null ? (
        <p className={cn(styles.value)}>{t('board.kpis.noLevel')}</p>
      ) : (
        <>
          <p className={cn(styles.value)}>
            {t('board.kpis.levelValue', { level: formatDecimal(level, LEVEL_DIGITS) })}
          </p>
          <p className={cn(styles.detail)}>
            {t('board.kpis.levelPercent', {
              percent: formatDecimal(
                levelFraction(level, tank.gaugeMin, tank.gaugeMax) * PERCENT,
                WHOLE,
              ),
            })}
          </p>
        </>
      )}
      {status.band === null ? (
        <p className={cn(styles.detail)}>{t('board.kpis.noBand')}</p>
      ) : (
        <p className={cn(styles.detail)}>
          {t('board.kpis.band', { band: bandLabel(status.band.code) })}
        </p>
      )}
    </Kpi>
  );
}

function ReserveKpi({ status }: ConsoleContext): JSX.Element {
  const rules = useCurrentRuleSet();
  const today = useServiceToday();
  const result = reserveDays({
    today,
    currentLevel: status.level?.value.value ?? null,
    reserveLevel: rules.data?.reserveLevel ?? null,
    points: (status.forecast?.points ?? []).map((point) => ({
      dayKey: point.targetDate,
      p50: point.p50,
    })),
  });
  let text: string;
  if (result === null || (result.atLeast && result.days === 0)) {
    text = t('board.kpis.reserveUnknown');
  } else if (result.days === 0 && !result.atLeast) {
    text = t('board.kpis.reserveNow');
  } else {
    const days = String(result.days);
    const phrase =
      result.days === SINGLE_DAY
        ? t('board.kpis.reserveDaysOne')
        : t('board.kpis.reserveDays', { days });
    text = result.atLeast ? t('board.kpis.reserveAtLeast', { days }) : phrase;
  }
  return (
    <Kpi id="kpi-reserve" title={t('board.kpis.reserve')} hint={t('board.kpis.reserveHint')}>
      <p className={cn(styles.value)}>{text}</p>
    </Kpi>
  );
}

function CoverageKpi(): JSX.Element | null {
  const allowed = usePermission(REPORT_PERMISSION);
  const today = useServiceToday();
  const days = lastDays(today, WEEK_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  const report = useReport(period, allowed);
  const sectors = useSectors();
  if (!allowed) {
    return null;
  }
  let body: JSX.Element;
  if (report.isError) {
    body = <p role="alert">{t('board.kpis.coverageError')}</p>;
  } else if (report.data === undefined) {
    body = <p className={cn(styles.detail)}>{t('board.loading')}</p>;
  } else {
    const rows = coverageByRegion(report.data.shifts, sectors.data ?? []);
    body =
      rows.length === 0 ? (
        <p className={cn(styles.detail)}>{t('board.kpis.coverageNone')}</p>
      ) : (
        <ul className={cn(styles.coverage)}>
          {rows.map((row) => (
            <li key={row.region}>
              {row.share === null
                ? t('board.kpis.coverageNoShifts', { region: row.region })
                : t('board.kpis.coverageRow', {
                    region: row.region,
                    percent: formatDecimal(row.share * PERCENT, WHOLE),
                    done: String(row.completedShifts),
                    planned: String(row.plannedShifts),
                  })}
            </li>
          ))}
        </ul>
      );
  }
  return (
    <Kpi id="kpi-coverage" title={t('board.kpis.coverage')} hint={t('board.kpis.coverageHint')}>
      {body}
    </Kpi>
  );
}

function IncidentsKpi(): JSX.Element | null {
  const allowed = usePermission(INCIDENT_PERMISSION);
  if (!allowed) {
    return null;
  }
  return <IncidentsCount />;
}

function IncidentsCount(): JSX.Element {
  const incidents = useIncidents();
  const open = (incidents.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((incident) => !CLOSED_STATUSES.includes(incident.status)).length;
  return (
    <Kpi id="kpi-incidents" title={t('board.kpis.incidents')} hint={t('board.kpis.incidentsHint')}>
      {incidents.isError ? (
        <p role="alert">{t('board.kpis.incidentsError')}</p>
      ) : (
        <p className={cn(styles.value)}>
          {incidents.isSuccess ? String(open) : t('board.loading')}
        </p>
      )}
    </Kpi>
  );
}
