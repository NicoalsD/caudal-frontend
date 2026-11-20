import { useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';

import { reasonIssueOf } from '../../core/proposal/ProposalEditorMediator';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { Dialog } from '../../ui/primitives/Dialog';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import { reasonIssueText } from './editorMessages';
import styles from './Proposals.module.css';

interface ApproveDialogProps {
  readonly trigger: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** "Aprobar el horario del ...: 4 sectores, 16 horas. ¿Aprobar?" (ux-guidelines section 6). */
  readonly summary: string;
  readonly isSaving: boolean;
  readonly failure: string | null;
  readonly onConfirm: () => void;
}

/** Confirmation with a summary before approving. The main button repeats the verb. */
export function ApproveDialog({
  trigger,
  open,
  onOpenChange,
  summary,
  isSaving,
  failure,
  onConfirm,
}: ApproveDialogProps): JSX.Element {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={t('proposals.approve.title')}
      description={summary}
    >
      {failure === null ? null : <FormAlert message={failure} />}
      <div className={cn(styles.actions)}>
        <Button variant="primary" disabled={isSaving} onClick={onConfirm}>
          {isSaving ? t('proposals.saving') : t('proposals.approve.confirm')}
        </Button>
        <Button
          onClick={() => {
            onOpenChange(false);
          }}
        >
          {t('proposals.editor.cancel')}
        </Button>
      </div>
    </Dialog>
  );
}

interface RejectDialogProps {
  readonly trigger: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly reasonMin: number;
  readonly reasonMax: number;
  readonly isSaving: boolean;
  readonly failure: string | null;
  readonly onConfirm: (reason: string) => void;
}

/**
 * Rejection with a mandatory reason. It is a destructive action, so the focus starts on Cancelar
 * (ux-guidelines section 6).
 */
export function RejectDialog({
  trigger,
  open,
  onOpenChange,
  reasonMin,
  reasonMax,
  isSaving,
  failure,
  onConfirm,
}: RejectDialogProps): JSX.Element {
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const issue = reasonIssueOf(reason, { reasonMin, reasonMax });
  const problem =
    issue === null || (!attempted && reason.length === 0)
      ? null
      : reasonIssueText(issue, { reasonMin, reasonMax });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          setAttempted(false);
        }
        onOpenChange(next);
      }}
      trigger={trigger}
      title={t('proposals.reject.title')}
      description={t('proposals.reject.description')}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        cancelRef.current?.focus();
      }}
    >
      <form
        noValidate
        className={cn(styles.stack)}
        onSubmit={(event) => {
          event.preventDefault();
          setAttempted(true);
          if (issue === null) {
            onConfirm(reason);
          }
        }}
      >
        <TextAreaField
          label={t('proposals.reject.reasonLabel')}
          hint={t('proposals.reject.reasonHint')}
          error={problem ?? undefined}
          length={reason.length}
          maxLength={reasonMax}
          counterText={(length, max) =>
            t('publicReport.counter', { length: String(length), max: String(max) })
          }
          value={reason}
          onChange={(event) => {
            setReason(event.currentTarget.value);
          }}
        />
        {failure === null ? null : <FormAlert message={failure} />}
        <div className={cn(styles.actions)}>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t('proposals.saving') : t('proposals.reject.confirm')}
          </Button>
          <Button
            ref={cancelRef}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t('proposals.editor.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
