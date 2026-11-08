import type { JSX } from 'react';
import { CheckCircle2, CircleDot } from 'lucide-react';
import { Link } from 'react-router';

import { formatDecimal } from '../../core/format/decimal';
import { currentProposalOf, type DayProposal } from '../../core/proposal/proposalDay';
import type { OperatingWindow } from '../../core/rules/ruleSetParts';
import { ROUTE_PATHS } from '../../core/session/routes';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { ScheduleItemView, SectorView } from '../../services/api/views';
import { useCurrentRuleSet } from '../../state/hooks/useCurrentRuleSet';
import { useOpenAnomalies } from '../../state/hooks/useAnomalies';
import { usePermission } from '../../state/hooks/usePermission';
import { useSectors } from '../../state/hooks/useSectors';
import { useServiceToday } from '../../state/hooks/useServiceToday';
import { cn } from '../../ui/styles/cn';
import { useIncidents } from '../incidents/incidentQueries';
import { useProposal, useProposalsOfDay } from '../proposals/proposalQueries';
import type { ConsoleContext } from '../tank-status';
import styles from './BoardConsole.module.css';

const LEVEL_DIGITS = 2;
const HOURS_DIGITS = 1;
const MINUTES_PER_HOUR = 60;
const PERCENT = 100;
const SUNDAY_JS = 0;
const SUNDAY_ISO = 7;
const NOON_BOGOTA = 'T12:00:00-05:00';
const INCIDENT_PERMISSION = 'INCIDENT_READ';
const CLOSED_STATUSES: readonly string[] = ['RESOLVED', 'DISMISSED'];

function clockMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * MINUTES_PER_HOUR + Number(minutes);
}

/** Today's shifts, sorted by their order in the proposal; "loading" until the day is known. */
function useTodayShifts(): {
  readonly items: readonly ScheduleItemView[];
  readonly isPublished: boolean;
} {
  const today = useServiceToday();
  const day = useProposalsOfDay(today);
  const current = currentProposalOf(
    (day.data ?? []).map((view): DayProposal => ({
      id: view.id,
      serviceDate: view.serviceDate,
      status: view.status,
      generatedAt: view.generatedAt.date.getTime(),
    })),
  );
  const proposal = useProposal(current?.id ?? '', current !== null);
  const items = [...(proposal.data?.items ?? [])].sort((a, b) => a.sequence - b.sequence);
  return { items, isPublished: current?.status === 'PUBLISHED' };
}

/** Window of operation of the service day: the widest of the windows that apply to it. */
function windowOfDay(
  windows: readonly OperatingWindow[],
  dayKey: string,
  items: readonly ScheduleItemView[],
): { readonly start: number; readonly end: number } | null {
  const jsDay = new Date(`${dayKey}${NOON_BOGOTA}`).getUTCDay();
  const isoDay = jsDay === SUNDAY_JS ? SUNDAY_ISO : jsDay;
  const today = windows.filter((item) => item.dayOfWeek === null || item.dayOfWeek === isoDay);
  const starts = [
    ...today.map((item) => clockMinutes(item.start)),
    ...items.map((i) => i.startMinutes),
  ];
  const ends = [
    ...today.map((item) => clockMinutes(item.end)),
    ...items.map((i) => i.startMinutes + i.hours * MINUTES_PER_HOUR),
  ];
  if (starts.length === 0 || ends.length === 0) {
    return null;
  }
  const start = Math.min(...starts);
  const end = Math.max(...ends);
  return end > start ? { start, end } : null;
}

function Panel({
  title,
  id,
  children,
}: {
  readonly title: string;
  readonly id: string;
  readonly children: JSX.Element | JSX.Element[];
}): JSX.Element {
  return (
    <section className={cn(styles.panel)} aria-labelledby={id}>
      <h2 id={id} className={cn(styles.panelTitle)}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function LevelsPanel({ status }: Pick<ConsoleContext, 'status'>): JSX.Element {
  const rules = useCurrentRuleSet();
  const bands = [...(rules.data?.bands ?? [])].sort((a, b) => b.minLevel - a.minLevel);
  return (
    <Panel title={t('tankStatus.levelsTitle')} id="console-levels">
      <table className={cn(styles.table)}>
        <thead>
          <tr>
            <th scope="col">{t('tankStatus.levelsBand')}</th>
            <th scope="col">{t('tankStatus.levelsRange')}</th>
            <th scope="col">{t('tankStatus.levelsHours')}</th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band) => {
            const isNow = status.band?.code === band.band;
            return (
              <tr key={band.band} className={cn(isNow && styles.now)}>
                <th scope="row">
                  {bandLabel(band.band)}
                  {isNow ? (
                    <span className={cn(styles.nowTag)}>
                      <CircleDot aria-hidden="true" className={cn(styles.tagIcon)} />
                      {t('tankStatus.levelsNow')}
                    </span>
                  ) : null}
                </th>
                <td>
                  {t('tankStatus.levelsRangeValue', {
                    from: formatDecimal(band.minLevel, LEVEL_DIGITS),
                    to: formatDecimal(band.maxLevel, LEVEL_DIGITS),
                  })}
                </td>
                <td>{formatDecimal(band.dailyServiceHours, HOURS_DIGITS)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function SectorsPanel(): JSX.Element {
  const sectors = useSectors();
  const { items } = useTodayShifts();
  const shiftOf = (sector: SectorView): ScheduleItemView | undefined =>
    items.find((item) => item.sectorId === sector.id);
  const active = (sectors.data ?? []).filter((sector) => sector.isActive);
  return (
    <Panel title={t('tankStatus.sectorsTitle')} id="console-sectors">
      {active.length === 0 ? (
        <p className={cn(styles.quiet)}>{t('tankStatus.sectorsNone')}</p>
      ) : (
        <table className={cn(styles.table)}>
          <tbody>
            {active.map((sector) => {
              const shift = shiftOf(sector);
              return (
                <tr key={sector.id}>
                  <th scope="row">{sector.name}</th>
                  <td className={cn(styles.wrap)}>
                    {shift === undefined
                      ? t('tankStatus.sectorsNoShift')
                      : t('tankStatus.sectorShift', { start: shift.startTime, end: shift.endTime })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

function ReviewCounts({ incidents }: { readonly incidents: number | null }): JSX.Element {
  const anomalies = useOpenAnomalies();
  const anomalyCount = anomalies.data?.items.length ?? 0;
  const nothing = anomalies.isSuccess && anomalyCount === 0 && (incidents ?? 0) === 0;
  return (
    <Panel title={t('tankStatus.reviewPanelTitle')} id="console-review">
      {nothing ? (
        <p className={cn(styles.allClear)}>
          <CheckCircle2 aria-hidden="true" className={cn(styles.tagIcon)} />
          {t('tankStatus.reviewNothing')}
        </p>
      ) : (
        <ul className={cn(styles.counts)}>
          <li>
            <a href="#anomalies-title">{t('tankStatus.reviewAnomalies')}</a>
            <span className={cn(styles.count)}>{anomalyCount}</span>
          </li>
          {incidents === null ? null : (
            <li>
              <Link to={ROUTE_PATHS.board.incidents}>{t('tankStatus.reviewIncidents')}</Link>
              <span className={cn(styles.count)}>{incidents}</span>
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

function ReviewWithIncidents(): JSX.Element {
  const incidents = useIncidents();
  const open = (incidents.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((incident) => !CLOSED_STATUSES.includes(incident.status)).length;
  return <ReviewCounts incidents={incidents.isSuccess ? open : null} />;
}

function ReviewPanel(): JSX.Element {
  const canSeeIncidents = usePermission(INCIDENT_PERMISSION);
  return canSeeIncidents ? <ReviewWithIncidents /> : <ReviewCounts incidents={null} />;
}

/** The left rail of the Board console: levels of the rules, sectors of the day, what to review. */
export function ConsoleRail({ status }: ConsoleContext): JSX.Element {
  return (
    <>
      <LevelsPanel status={status} />
      <SectorsPanel />
      <ReviewPanel />
    </>
  );
}

/** "Turnos de hoy": each sector's shift as a bar over the rule's window of operation. */
export function ShiftsToday(): JSX.Element {
  const today = useServiceToday();
  const rules = useCurrentRuleSet();
  const sectors = useSectors();
  const { items, isPublished } = useTodayShifts();
  const nameOf = new Map((sectors.data ?? []).map((sector) => [sector.id, sector.name]));
  const window = windowOfDay(rules.data?.operatingWindows ?? [], today, items);
  return (
    <section className={cn(styles.panel, styles.shifts)} aria-labelledby="console-shifts">
      <h2 id="console-shifts" className={cn(styles.panelTitle)}>
        {t('tankStatus.shiftsTitle')}
      </h2>
      {items.length === 0 || window === null ? (
        <p className={cn(styles.quiet)}>{t('tankStatus.shiftsEmpty')}</p>
      ) : (
        <>
          <p className={cn(styles.quiet)}>
            {isPublished ? t('tankStatus.shiftsPublished') : t('tankStatus.shiftsDraft')}
          </p>
          <table className={cn(styles.table)}>
            <thead>
              <tr>
                <th scope="col">{t('tankStatus.shiftsSector')}</th>
                <th scope="col" className={cn(styles.barColumn)}>
                  {t('tankStatus.shiftsBar')}
                </th>
                <th scope="col">{t('tankStatus.shiftsStart')}</th>
                <th scope="col">{t('tankStatus.shiftsEnd')}</th>
                <th scope="col">{t('tankStatus.shiftsHours')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const span = window.end - window.start;
                const left = ((item.startMinutes - window.start) / span) * PERCENT;
                const width = ((item.hours * MINUTES_PER_HOUR) / span) * PERCENT;
                return (
                  <tr key={item.id}>
                    <th scope="row">{nameOf.get(item.sectorId) ?? item.sectorId}</th>
                    <td className={cn(styles.barColumn)}>
                      <div
                        className={cn(styles.track)}
                        role="img"
                        aria-label={t('tankStatus.shiftsBarLabel', {
                          start: item.startTime,
                          end: item.endTime,
                        })}
                      >
                        <div
                          className={cn(styles.fill)}
                          style={{
                            insetInlineStart: `${String(left)}%`,
                            width: `${String(width)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td>{item.startTime}</td>
                    <td>{item.endTime}</td>
                    <td>
                      {t('tankStatus.shiftsHoursValue', {
                        hours: formatDecimal(item.hours, HOURS_DIGITS),
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
