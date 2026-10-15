import type { JSX } from 'react';
import { generatePath, Link } from 'react-router';

import { formatServiceDate } from '../../core/format/serviceDate';
import { ROUTE_PATHS } from '../../core/session/routes';
import { t } from '../../i18n/t';
import type { PublicScheduleView } from '../../services/api/views';
import { ScreenTitle } from '../../ui/feedback/ScreenTitle';
import { SimulatedDataBanner } from '../../ui/feedback/SimulatedDataBanner';
import { cn } from '../../ui/styles/cn';
import styles from './PublicSchedule.module.css';
import { PosterLink } from './PosterLink';
import { WhatsAppCopy } from './WhatsAppCopy';

interface PublicScheduleContentProps {
  readonly aqueductSlug: string;
  readonly schedule: PublicScheduleView;
}

/**
 * The published schedule of the day, by sector. It shows the aqueduct name, the service day, the
 * publication instant and the turns: nothing else from the payload is rendered (no personal data).
 */
export function PublicScheduleContent({
  aqueductSlug,
  schedule,
}: PublicScheduleContentProps): JSX.Element {
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
        <section aria-labelledby="public-schedule-sectors">
          <h2 id="public-schedule-sectors">{t('publicSchedule.sectorsHeading')}</h2>
          <ul className={cn(styles.sectorList)}>
            {schedule.items.map((item, index) => (
              <li key={`${index}-${item.sectorName}`} className={cn(styles.sector)}>
                <span className={cn(styles.sectorName)}>{item.sectorName}</span>
                <span className={cn(styles.hours)}>
                  {t('publicSchedule.range', { start: item.startTime, end: item.endTime })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="public-share-heading" className={cn(styles.share)}>
        <h2 id="public-share-heading">{t('publicSchedule.share.heading')}</h2>
        <WhatsAppCopy aqueductSlug={aqueductSlug} />
        <PosterLink aqueductSlug={aqueductSlug} />
      </section>
      <p>
        <Link
          className={cn(styles.linkButton)}
          to={generatePath(ROUTE_PATHS.public.damageReport, { aqueductSlug })}
        >
          {t('publicSchedule.reportDamage')}
        </Link>{' '}
        <Link className={cn(styles.linkButton)} to={generatePath(ROUTE_PATHS.public.tracking)}>
          {t('publicSchedule.trackReport')}
        </Link>
      </p>
    </>
  );
}
