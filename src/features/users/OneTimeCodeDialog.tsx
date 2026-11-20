import { useState } from 'react';
import type { JSX } from 'react';

import { t } from '../../i18n/t';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import styles from './Users.module.css';

/** A code the API returns once. It lives only in the screen state while this dialog is open. */
export interface IssuedCode {
  readonly title: string;
  readonly description: string;
  readonly code: string;
  /** When it stops working, already formatted in America/Bogota. */
  readonly expiresText: string;
}

interface OneTimeCodeDialogProps {
  /** Null when there is no code to show. Closing the dialog asks the screen to drop it. */
  readonly issued: IssuedCode | null;
  readonly onClose: () => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Shows a one-time code with a copy button and a warning that it is not shown again. The screen
 * clears the code when the dialog closes; nothing is stored in the browser.
 */
export function OneTimeCodeDialog({ issued, onClose }: OneTimeCodeDialogProps): JSX.Element {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const isOpen = issued !== null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setCopyState('idle');
          onClose();
        }
      }}
      title={issued?.title ?? ''}
      description={issued?.description ?? ''}
    >
      {issued === null ? null : (
        <div className={styles.codeBox}>
          <p className={styles.warning} role="note">
            {t('users.codeWarning')}
          </p>
          <output className={styles.code} aria-label={issued.title}>
            {issued.code}
          </output>
          <p className={styles.hint}>{t('users.expires', { date: issued.expiresText })}</p>
          <div className={styles.actions}>
            <Button
              variant="primary"
              onClick={() => {
                copyCode(issued.code)
                  .then(() => {
                    setCopyState('copied');
                  })
                  .catch(() => {
                    setCopyState('failed');
                  });
              }}
            >
              {t('users.copyCode')}
            </Button>
            <Button
              onClick={() => {
                setCopyState('idle');
                onClose();
              }}
            >
              {t('users.codeDone')}
            </Button>
          </div>
          <p role="status" className={styles.hint}>
            {copyState === 'copied' ? t('users.copied') : null}
            {copyState === 'failed' ? t('users.copyFailed') : null}
          </p>
        </div>
      )}
    </Dialog>
  );
}

async function copyCode(code: string): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
    throw new Error('Clipboard is not available');
  }
  await navigator.clipboard.writeText(code);
}
