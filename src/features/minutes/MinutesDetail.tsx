import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { EPISTEMIC_SECTIONS } from '../../core/minutes/minutesPeriod';
import type { EpistemicSection } from '../../core/minutes/minutesPeriod';
import { t } from '../../i18n/t';
import type { MinutesView } from '../../services/api/views';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { cn } from '../../ui/styles/cn';
import { EpistemicChip } from './EpistemicChip';
import styles from './Minutes.module.css';
import { useMinutes } from './minutesQueries';

/** What each section means, in plain words (screens.md S20). */
const SECTION_HINT = {
  observed: 'minutes.sectionObservedHint',
  estimated: 'minutes.sectionEstimatedHint',
  inferred: 'minutes.sectionInferredHint',
  confirmed: 'minutes.sectionConfirmedHint',
} as const satisfies Record<EpistemicSection, string>;

/** One acta with its four sections, each with its chip. Dashed for the inferred section. */
export function MinutesDetail({ id }: { readonly id: string }): JSX.Element {
  const minutes = useMinutes(id);
  if (minutes.isPending) {
    return <LoadingState message={t('minutes.loadingDetail')} />;
  }
  if (minutes.isError) {
    return <p role="alert">{t('minutes.detailError')}</p>;
  }
  const view: MinutesView = minutes.data;
  const statusText = view.status === 'FINAL' ? t('minutes.statusFinal') : t('minutes.statusDraft');
  return (
    <section aria-labelledby="minutes-detail-title" className={cn(styles.stack)}>
      <h2 id="minutes-detail-title">
        {t('minutes.period', {
          from: formatDayKey(view.periodFrom),
          to: formatDayKey(view.periodTo),
        })}
      </h2>
      <p>{t('minutes.generatedOn', { date: view.generatedAt.text })}</p>
      <p>{t('minutes.status', { status: statusText })}</p>
      <h3>{t('minutes.sectionsTitle')}</h3>
      {EPISTEMIC_SECTIONS.map((section) => {
        const entries = view.content[section];
        return (
          <section
            key={section}
            aria-labelledby={`minutes-${section}`}
            className={cn(styles.section)}
          >
            <h4 id={`minutes-${section}`}>
              <EpistemicChip section={section} />
            </h4>
            <p className={cn(styles.hint)}>{t(SECTION_HINT[section])}</p>
            {entries.length === 0 ? (
              <p>{t('minutes.sectionEmpty')}</p>
            ) : (
              <ul className={cn(styles.entries)}>
                {entries.map((entry) => (
                  <li key={`${entry.source}:${entry.sourceId}`} className={cn(styles.entry)}>
                    <span>{entry.summary}</span>
                    <span className={cn(styles.entryAt)}>{entry.at.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </section>
  );
}
