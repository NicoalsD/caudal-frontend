import { useState } from 'react';
import type { JSX } from 'react';

import { formatDayKey } from '../../core/format/time';
import { EPISTEMIC_SECTIONS } from '../../core/minutes/minutesPeriod';
import type { EpistemicSection } from '../../core/minutes/minutesPeriod';
import { minutesPdfFileName } from '../../core/minutes/pdfFileName';
import { shortSha } from '../../core/minutes/shortSha';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import type { MinutesView } from '../../services/api/views';
import { useConnection } from '../../state/hooks/useConnection';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { LoadingState } from '../../ui/feedback/LoadingState';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { cn } from '../../ui/styles/cn';
import { EpistemicChip } from './EpistemicChip';
import styles from './Minutes.module.css';
import { useDownloadMinutesPdf, useFinalizeMinutes, useMinutes } from './minutesQueries';

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
      {view.finalizedAt === null ? null : (
        <p>{t('minutes.finalizedOn', { date: view.finalizedAt.text })}</p>
      )}
      <MinutesFinal view={view} />
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

/**
 * The actions of the acta: a draft is finalized (after a confirmation); a final acta offers its PDF
 * and the SHA-256 of that PDF, shortened, with a button that copies the whole hash.
 */
function MinutesFinal({ view }: { readonly view: MinutesView }): JSX.Element {
  const connection = useConnection();
  const online = connection === 'ONLINE';
  const finalize = useFinalizeMinutes(view.id);
  const [confirming, setConfirming] = useState(false);

  if (view.status === 'DRAFT') {
    return (
      <div className={cn(styles.actions)}>
        <Dialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t('minutes.finalize')}
          description={t('minutes.finalizeDescription')}
          trigger={
            <Button variant="primary" disabled={!online || finalize.isPending}>
              {finalize.isPending ? t('minutes.finalizing') : t('minutes.finalize')}
            </Button>
          }
        >
          <div className={cn(styles.actions)}>
            <Button
              variant="primary"
              disabled={finalize.isPending}
              onClick={() => {
                finalize.mutate(undefined, {
                  onSuccess: () => {
                    setConfirming(false);
                  },
                  onError: () => {
                    setConfirming(false);
                  },
                });
              }}
            >
              {t('minutes.finalizeConfirm')}
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
              }}
            >
              {t('closure.closeCancel')}
            </Button>
          </div>
        </Dialog>
        {finalize.isError ? <FormAlert message={errorText(finalize.error).message} /> : null}
      </div>
    );
  }

  const hash = view.pdfSha256 ?? '';
  return (
    <div className={cn(styles.actions)}>
      {online ? <DownloadPdf view={view} /> : <p role="status">{t('minutes.offline')}</p>}
      <HashCopy hash={hash} />
    </div>
  );
}

/**
 * The PDF button. The download carries the token, so it is a request, not a link: the status line
 * tells that it is running, and an error is shown in the same way as the other actions.
 */
function DownloadPdf({ view }: { readonly view: MinutesView }): JSX.Element {
  const download = useDownloadMinutesPdf();
  return (
    <div className={cn(styles.actions)}>
      <Button
        disabled={download.isPending}
        onClick={() => {
          download.mutate({
            id: view.id,
            fileName: minutesPdfFileName(view.periodFrom, view.periodTo),
          });
        }}
      >
        {t('minutes.downloadPdf')}
      </Button>
      <p role="status">{download.isPending ? t('minutes.downloadingPdf') : ''}</p>
      {download.isError ? <FormAlert message={errorText(download.error).message} /> : null}
    </div>
  );
}

/** The SHA-256 of the final PDF: shortened on screen, the copy button takes the whole value. */
function HashCopy({ hash }: { readonly hash: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className={cn(styles.actions)}>
      <span>{t('minutes.hashLabel')}</span>
      <code>{shortSha(hash)}</code>
      <Button onClick={() => void copy()}>{t('minutes.copyHash')}</Button>
      <p role="status">{copied ? t('minutes.copiedHash') : ''}</p>
    </div>
  );
}
