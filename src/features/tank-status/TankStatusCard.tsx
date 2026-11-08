import type { JSX } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock, Minus } from 'lucide-react';

import { formatDecimal } from '../../core/format/decimal';
import { bandLabel } from '../../i18n/bandLabel';
import { t } from '../../i18n/t';
import type { RuleSetView, TankStatusView, TankView, TrendLabel } from '../../services/api/views';
import { usePermission } from '../../state/hooks/usePermission';
import { cn } from '../../ui/styles/cn';
import type { ForecastRow } from './forecastRows';
import { LevelTimeline } from './LevelTimeline';
import { selectionOf } from './levelTimeline';
import { TankStage } from '../../ui/tank/TankStage';
import styles from './TankStatus.module.css';

/** Whole hours: the age of a level is a rough figure for the person reading it. */
const HOURS_DIGITS = 0;
const SLOPE_DIGITS = 2;
/** Whoever may register readings is told to register one; the others to ask the plumber. */
const READING_PERMISSION = 'READING_CREATE';

interface TankStatusCardProps {
  readonly tank: TankView;
  readonly status: TankStatusView;
  readonly rules: RuleSetView | undefined;
  readonly rows: readonly ForecastRow[];
  readonly index: number;
  readonly defaultIndex: number;
  readonly todayIndex: number;
  readonly onPick: (index: number) => void;
  /** The Board never registers readings: it asks the plumber, whatever its permissions. */
  readonly askPlumber?: boolean;
}

function trendText(trend: NonNullable<TankStatusView['trend']>): string {
  switch (trend.label) {
    case 'DOWN':
      return t('tankStatus.trendDown');
    case 'STABLE':
      return t('tankStatus.trendStable');
    case 'UP':
      return t('tankStatus.trendUp');
    case null:
      return trend.labelEs ?? t('tankStatus.trendStable');
  }
}

/** The arrow is a second signal next to the words, never the only one. */
function TrendIcon({ label }: { readonly label: TrendLabel | null }): JSX.Element {
  switch (label) {
    case 'DOWN':
      return <ArrowDownRight aria-hidden="true" className={cn(styles.icon)} />;
    case 'UP':
      return <ArrowUpRight aria-hidden="true" className={cn(styles.icon)} />;
    default:
      return <Minus aria-hidden="true" className={cn(styles.icon)} />;
  }
}

function meaningText(code: string, serviceHours: number | null): string {
  if (serviceHours === null) {
    return t('tankStatus.meaningNoHours', { band: bandLabel(code).toLowerCase() });
  }
  const hours = formatDecimal(serviceHours, HOURS_DIGITS);
  switch (code) {
    case 'CRITICAL':
      return t('tankStatus.meaningCritical', { hours });
    case 'HIGH':
      return t('tankStatus.meaningHigh', { hours });
    default:
      return t('tankStatus.meaningLow', { hours });
  }
}

/**
 * The tank, large, with what it means in one sentence, how it is moving, when it was read and a
 * slider to see the level of other days. The band hours come from the rules when the status does
 * not send them.
 */
export function TankStatusCard({
  tank,
  status,
  rules,
  rows,
  index,
  defaultIndex,
  todayIndex,
  onPick,
  askPlumber = false,
}: TankStatusCardProps): JSX.Element {
  const canRegister = usePermission(READING_PERMISSION);
  const band = status.band;
  const serviceHours =
    band === null
      ? null
      : (band.serviceHours ??
        rules?.bands.find((item) => item.band === band.code)?.dailyServiceHours ??
        null);
  const row = rows[index];
  const picked = row === undefined || index === defaultIndex ? null : selectionOf(row);
  const level = picked?.level ?? status.level?.value.value ?? null;

  return (
    <>
      <section className={cn(styles.card, styles.factsCard)} aria-labelledby="tank-card-title">
        <h2 id="tank-card-title">{t('tankStatus.cardTitle')}</h2>
        {status.level === null ? (
          <p>{t('tankStatus.noLevel')}</p>
        ) : (
          <div className={cn(styles.facts)}>
            {band === null ? null : (
              <p className={cn(styles.meaning)}>{meaningText(band.code, serviceHours)}</p>
            )}
            <p className={cn(styles.muted, styles.trendLine)}>
              {status.trend === null ? (
                t('tankStatus.noTrend')
              ) : (
                <>
                  <TrendIcon label={status.trend.label} />
                  <strong>{trendText(status.trend)}</strong>
                  {t('tankStatus.slopePerDay', {
                    value: formatDecimal(status.trend.slopePerDay, SLOPE_DIGITS),
                  })}
                </>
              )}
            </p>
            <p className={cn(styles.muted)}>
              <span>
                {t('tankStatus.takenAgo', {
                  hours: formatDecimal(status.level.hoursAgo, HOURS_DIGITS),
                })}
              </span>
              {' · '}
              <span>{t('tankStatus.observedAt', { date: status.level.observedAt.text })}</span>
            </p>
            {status.stale.isStale ? (
              <div className={cn(styles.stale)} role="status">
                <Clock aria-hidden="true" className={cn(styles.icon)} />
                <div>
                  <strong>{t('tankStatus.staleTitle')}</strong>
                  <p>
                    {t(
                      canRegister && !askPlumber
                        ? 'tankStatus.staleText'
                        : 'tankStatus.staleTextBoard',
                      {
                        hours: formatDecimal(status.stale.staleAfterHours, HOURS_DIGITS),
                      },
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
      <div className={cn(styles.tankCard)}>
        {level === null ? (
          <section className={cn(styles.card)}>
            <LevelTimeline
              rows={rows}
              index={index}
              defaultIndex={defaultIndex}
              todayIndex={todayIndex}
              onChange={onPick}
            />
          </section>
        ) : (
          <TankStage
            heading={t('tankStatus.stageTitle')}
            level={level}
            gaugeMin={tank.gaugeMin}
            gaugeMax={tank.gaugeMax}
            bands={(rules?.bands ?? []).map((item) => ({
              code: item.band,
              from: item.minLevel,
              to: item.maxLevel,
            }))}
            reserveLevel={rules?.reserveLevel ?? null}
            capacityLiters={tank.capacityLiters}
            {...(picked?.rangeLow === undefined ? {} : { rangeLow: picked.rangeLow })}
            {...(picked?.rangeHigh === undefined ? {} : { rangeHigh: picked.rangeHigh })}
          >
            <LevelTimeline
              rows={rows}
              index={index}
              defaultIndex={defaultIndex}
              todayIndex={todayIndex}
              onChange={onPick}
              onDark
            />
          </TankStage>
        )}
      </div>
    </>
  );
}
