import { useState } from 'react';
import type { JSX } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck } from 'lucide-react';

import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';
import { useCaudalApi } from '../../state/hooks/apiContext';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { cn } from '../../ui/styles/cn';
import { copyText } from './clipboard';
import styles from './PublicSchedule.module.css';

interface WhatsAppCopyProps {
  readonly aqueductSlug: string;
}

/**
 * Copies the day's schedule as a WhatsApp message. The confirmation is text with an icon, read by
 * assistive technology. When the clipboard is unavailable or refuses, the text stays on screen in
 * a selectable box, so the person can copy it by hand.
 */
export function WhatsAppCopy({ aqueductSlug }: WhatsAppCopyProps): JSX.Element {
  const api = useCaudalApi();
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const fetchText = useMutation({
    mutationFn: () => api.public.whatsappText(aqueductSlug),
  });

  const placeText = async (text: string): Promise<void> => {
    if (await copyText(text)) {
      setCopied(true);
    } else {
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
    <div className={cn(styles.copy)}>
      <Button className={cn(styles.action)} onClick={copy} disabled={fetchText.isPending}>
        {fetchText.isPending
          ? t('publicSchedule.share.copying')
          : t('publicSchedule.share.copyWhatsApp')}
      </Button>
      {fetchText.isError ? <FormAlert message={errorText(fetchText.error).message} /> : null}
      <p role="status" className={cn(styles.status)}>
        {copied ? (
          <>
            <CircleCheck aria-hidden="true" className={cn(styles.statusIcon)} />
            <span>{t('publicSchedule.share.copied')}</span>
          </>
        ) : null}
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
    </div>
  );
}
