import { useId } from 'react';
import type { JSX } from 'react';
import { generatePath, Link } from 'react-router';

import { resolveChosenSector, turnsForSector } from '../../core/public/sectorChoice';
import { formatServiceDate } from '../../core/format/serviceDate';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import type { PublicScheduleItemView, PublicScheduleView } from '../../services/api/views';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { useChosenSector } from '../../state/hooks/useChosenSector';
import { cn } from '../../ui/styles/cn';
import styles from './PublicSchedule.module.css';
import { PosterLink } from './PosterLink';
import { WhatsAppCopy } from './WhatsAppCopy';

interface PublicScheduleContentProps {
  readonly aqueductSlug: string;
  readonly schedule: PublicScheduleView;
}

/** The sector names in the order the schedule gives them, each one once. */
function sectorNamesOf(items: readonly PublicScheduleItemView[]): string[] {
  return [...new Set(items.map((item) => item.sectorName))];
}

/**
 * The published schedule of the day. First the answer the family came for: the turn of their own
 * sector, remembered on this phone. Then every sector, then the secondary actions. Only the
 * aqueduct name, the service day, the publication instant and the turns are rendered: nothing
 * else from the payload (no personal data).
 */
export function PublicScheduleContent({
  aqueductSlug,
  schedule,
}: PublicScheduleContentProps): JSX.Element {
  const selectId = useId();
  const hintId = `${selectId}-hint`;
  const [storedSector, chooseSector] = useChosenSector(aqueductSlug);
  const chosen = resolveChosenSector(schedule.items, storedSector);
  const sectorNames = sectorNamesOf(schedule.items);

  const chosenTurns = chosen === null ? [] : turnsForSector(schedule.items, chosen);

  return (
    <>
      {schedule.isDemo ? <SimulatedDataBanner /> : null}
      <ScreenTitle>{t('publicSchedule.title', { name: schedule.aqueductName })}</ScreenTitle>
      <p className={cn(styles.serviceDay)}>
        <time dateTime={schedule.serviceDate}>
          {t('publicSchedule.serviceDay', { date: formatServiceDate(schedule.serviceDate) })}
        </time>
      </p>
      <p className={cn(styles.published)}>
        {t('publicSchedule.publishedAt', { date: schedule.publishedAt.text })}
      </p>

      {schedule.items.length === 0 ? (
        <p>{t('publicSchedule.empty')}</p>
      ) : (
        <>
          <section aria-labelledby="public-my-sector-heading" className={cn(styles.mySector)}>
            <h2 id="public-my-sector-heading">{t('publicSchedule.mySector.heading')}</h2>
            <div className={cn(styles.selectField)}>
              <label className={cn(styles.selectLabel)} htmlFor={selectId}>
                {t('publicSchedule.mySector.label')}
              </label>
              <select
                id={selectId}
                className={cn(styles.select)}
                aria-describedby={hintId}
                value={chosen ?? ''}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  chooseSector(value === '' ? null : value);
                }}
              >
                <option value="">{t('publicSchedule.mySector.placeholder')}</option>
                {sectorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <p id={hintId} className={cn(styles.hint)}>
                {t('publicSchedule.mySector.remembered')}
              </p>
            </div>
            <div aria-live="polite">
              {chosen === null ? (
                <p className={cn(styles.message)}>{t('publicSchedule.mySector.choose')}</p>
              ) : chosenTurns.length === 0 ? (
                <p className={cn(styles.message)}>{t('publicSchedule.mySector.noTurn')}</p>
              ) : (
                <div className={cn(styles.turn)}>
                  <p className={cn(styles.turnSector)}>{chosen}</p>
                  {chosenTurns.map((turn, index) => (
                    <p key={`${index}-${turn.startTime}`} className={cn(styles.turnHours)}>
                      <time>
                        {t('publicSchedule.range', { start: turn.startTime, end: turn.endTime })}
                      </time>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="public-schedule-sectors">
            <h2 id="public-schedule-sectors">{t('publicSchedule.sectorsHeading')}</h2>
            <ul className={cn(styles.sectorList)}>
              {schedule.items.map((item, index) => {
                const isChosen = item.sectorName === chosen;
                return (
                  <li
                    key={`${index}-${item.sectorName}`}
                    className={cn(styles.sectorRow, isChosen && styles.sectorRowChosen)}
                  >
                    <span className={cn(styles.sectorName)}>
                      {item.sectorName}
                      {isChosen ? (
                        <span className={cn(styles.chosenTag)}>
                          {t('publicSchedule.chosenTag')}
                        </span>
                      ) : null}
                    </span>
                    <span className={cn(styles.hours)}>
                      {t('publicSchedule.range', {
                        start: item.startTime,
                        end: item.endTime,
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="public-share-heading" className={cn(styles.more)}>
        <h2 id="public-share-heading" className={cn(styles.moreHeading)}>
          {t('publicSchedule.share.heading')}
        </h2>
        <WhatsAppCopy aqueductSlug={aqueductSlug} />
        <PosterLink aqueductSlug={aqueductSlug} />
        <Link
          className={cn(styles.action)}
          to={generatePath(ROUTE_PATHS.public.damageReport, { aqueductSlug })}
        >
          {t('publicSchedule.reportDamage')}
        </Link>
        <Link className={cn(styles.action)} to={generatePath(ROUTE_PATHS.public.tracking)}>
          {t('publicSchedule.trackReport')}
        </Link>
      </section>
    </>
  );
}
