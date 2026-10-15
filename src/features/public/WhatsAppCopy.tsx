import { useState } from 'react';
import type { JSX } from 'react';
import { useMutation } from '@tanstack/react-query';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import styles from './PublicSchedule.module.css';

interface WhatsAppCopyProps {
  readonly aqueductSlug: string;
}

/**
 * Copies the day's schedule as a WhatsApp message. When the clipboard is unavailable or refuses,
 * the text stays on screen in a selectable box, so the person can copy it by hand.
 */
export function WhatsAppCopy({ aqueductSlug }: WhatsAppCopyProps): JSX.Element {
  const api = useCaudalApi();
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const fetchText = useMutation({
    mutationFn: () => api.public.whatsappText(aqueductSlug),
  });

  const placeText = async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard === undefined) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setManualText(text);
    }
  };

  const copy = (): void => {
    setCopied(false);
    setManualText(null);
    fetchText.mutate(undefined, {
      onSuccess: (text) => {
        void placeText(text);
      },
    });
  };

  return (
    <section aria-labelledby="public-share-heading" className={cn(styles.share)}>
      <h2 id="public-share-heading">{t('publicSchedule.share.heading')}</h2>
      <Button variant="primary" onClick={copy} disabled={fetchText.isPending}>
        {t('publicSchedule.share.copyWhatsApp')}
      </Button>
      {fetchText.isError ? <FormAlert message={errorText(fetchText.error).message} /> : null}
      <p role="status" className={cn(styles.status)}>
        {copied ? t('publicSchedule.share.copied') : ''}
      </p>
      {manualText === null ? null : (
        <>
          <p>{t('publicSchedule.share.manualHint')}</p>
          <label className={cn(styles.manualLabel)} htmlFor="public-share-manual">
            {t('publicSchedule.share.manualLabel')}
          </label>
          <textarea
            id="public-share-manual"
            className={cn(styles.manualText)}
            readOnly
            rows={6}
            value={manualText}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
        </>
      )}
    </section>
  );
}
