import type { JSX } from 'react';
import { Bot, CalendarCheck, Droplets, Hourglass, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';

import { formatDecimal } from '../../core/format/decimal';
import { coverageByRegion } from '../../core/reports/regionCoverage';
import { lastDays, reportInstants, WEEK_DAYS } from '../../core/reports/reportPeriod';
import { ROUTE_PATHS } from '../../core/session/routes';
import { levelFraction } from '../../core/scene/flow';
import { bandLabel } from '../../i18n/bandLabel';
import { lower } from '../../i18n/lower';
import { t } from '../../i18n/t';
import { useAutopilotSettings } from '../../state/hooks/useAutopilot';
import { usePermission } from '../../state/hooks/usePermission';
import { useReport } from '../../state/hooks/useReports';
import { useSectors } from '../../state/hooks/useSectors';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { StatTile } from '../../ui/cards/StatTile';
import { cn } from '../../ui/styles/cn';
import { PERMISSION_ASSISTANT } from '../aqueduct/permissions';
import { useIncidents } from '../incidents/incidentQueries';
import { levelDelta, useReserveText } from '../tank-status';
import type { ConsoleContext } from '../tank-status';
import styles from './BoardPanel.module.css';

const LEVEL_DIGITS = 2;
const WHOLE = 0;
const PERCENT = 100;
const CLOSED_STATUSES: readonly string[] = ['RESOLVED', 'DISMISSED'];
const REPORT_PERMISSION = 'REPORT_VIEW';
const INCIDENT_PERMISSION = 'INCIDENT_READ';

/**
 * The pastel tiles at the right of the chart (ISA-101 level 1): few big numbers. The level and its
 * band, the days of reserve by the median forecast, the week's coverage by region, the open
 * incidents and the pilot's mode. A figure the person has no permission to read is left out.
 */
export function BoardKpis({ tank, status }: ConsoleContext): JSX.Element {
  return (
    <div className={cn(styles.tiles)} role="group" aria-label={t('board.kpis.label')}>
      <LevelTile tank={tank} status={status} />
      <ReserveTile status={status} />
      <CoverageTile />
      <IncidentsTile />
      <PilotTile />
    </div>
  );
}

function LevelTile({ tank, status }: ConsoleContext): JSX.Element {
  const level = status.level?.value.value ?? null;
  const delta = levelDelta(status.trend);
  const percent =
    level === null
      ? null
      : formatDecimal(levelFraction(level, tank.gaugeMin, tank.gaugeMax) * PERCENT, WHOLE);
  return (
    <StatTile
      icon={Droplets}
      tint="aqua"
      label={t('board.kpis.level')}
      value={
        level === null
          ? t('board.kpis.noLevel')
          : t('board.kpis.levelValue', { level: formatDecimal(level, LEVEL_DIGITS) })
      }
      {...(delta === undefined ? {} : { delta })}
      footer={
        <>
          {percent === null ? null : <span>{t('board.kpis.levelPercent', { percent })}</span>}
          {percent === null ? null : <br />}
          <span>
            {status.band === null
              ? t('board.kpis.noBand')
              : t('board.kpis.band', { band: bandLabel(status.band.code) })}
          </span>
        </>
      }
    />
  );
}

function ReserveTile({ status }: Pick<ConsoleContext, 'status'>): JSX.Element {
  return (
    <StatTile
      icon={Hourglass}
      tint="cream"
      label={t('board.kpis.reserve')}
      value={useReserveText(status)}
      footer={t('board.kpis.reserveHint')}
    />
  );
}

function CoverageTile(): JSX.Element | null {
  const allowed = usePermission(REPORT_PERMISSION);
  const today = useServiceToday();
  const days = lastDays(today, WEEK_DAYS);
  const period = days === null ? null : reportInstants(days.from, days.to);
  const report = useReport(period, allowed);
  const sectors = useSectors();
  if (!allowed) {
    return null;
  }
  let value = t('board.loading');
  let footer: JSX.Element;
  if (report.isError) {
    value = t('board.kpis.noLevel');
    footer = <p role="alert">{t('board.kpis.coverageError')}</p>;
  } else if (report.data === undefined) {
    footer = <p>{t('board.loading')}</p>;
  } else {
    const rows = coverageByRegion(report.data.shifts, sectors.data ?? []);
    const planned = rows.reduce((sum, row) => sum + row.plannedShifts, 0);
    const done = rows.reduce((sum, row) => sum + row.completedShifts, 0);
    value =
      planned === 0
        ? t('board.kpis.reserveUnknown')
        : `${formatDecimal((done / planned) * PERCENT, WHOLE)} %`;
    footer =
      rows.length === 0 ? (
        <p>{t('board.kpis.coverageNone')}</p>
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
    <StatTile
      icon={CalendarCheck}
      tint="mint"
      label={t('board.kpis.coverage')}
      value={value}
      footer={footer}
    />
  );
}

function IncidentsTile(): JSX.Element | null {
  const allowed = usePermission(INCIDENT_PERMISSION);
  return allowed ? <IncidentsCount /> : null;
}

function IncidentsCount(): JSX.Element {
  const incidents = useIncidents();
  const open = (incidents.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((incident) => !CLOSED_STATUSES.includes(incident.status)).length;
  let value = t('board.loading');
  if (incidents.isError) {
    value = t('board.kpis.noLevel');
  } else if (incidents.isSuccess) {
    value = String(open);
  }
  return (
    <StatTile
      icon={TriangleAlert}
      tint="coral"
      label={t('board.kpis.incidents')}
      value={value}
      footer={
        incidents.isError ? (
          <p role="alert">{t('board.kpis.incidentsError')}</p>
        ) : (
          <Link to={ROUTE_PATHS.board.incidents}>{t('anomalies.incidentsLink')}</Link>
        )
      }
    />
  );
}

function PilotTile(): JSX.Element | null {
  const allowed = usePermission(PERMISSION_ASSISTANT);
  const settings = useAutopilotSettings(allowed);
  if (!allowed) {
    return null;
  }
  return (
    <StatTile
      icon={Bot}
      tint="lavender"
      label={t('board.pilotTile.title')}
      value={
        settings.isSuccess ? t(`autopilot.mode.${lower(settings.data.mode)}`) : t('board.loading')
      }
      footer={<Link to={ROUTE_PATHS.board.autopilot}>{t('board.pilotTile.open')}</Link>}
    />
  );
}
