import { useRef, useState } from 'react';
import type { JSX } from 'react';

import { formatDecimal } from '../../core/format/decimal';
import {
  ProposalEditorMediator,
  type EditorState,
  type ProposalEditorInput,
} from '../../core/proposal/ProposalEditorMediator';
import { t } from '../../i18n/t';
import { FormAlert } from '../../ui/feedback/FormAlert';
import { Button } from '../../ui/primitives/Button';
import { TextAreaField } from '../../ui/primitives/TextAreaField';
import { cn } from '../../ui/styles/cn';
import {
  reasonIssueText,
  shiftIssueText,
  totalExceedsText,
  type EditorBounds,
} from './editorMessages';
import styles from './ProposalEditor.module.css';
import { ShiftHoursField } from './ShiftHoursField';
import { useEditorState } from './useEditorState';

export interface EditorSubmit {
  readonly mediator: ProposalEditorMediator;
  readonly state: EditorState;
}

interface ProposalEditorFormProps {
  readonly input: ProposalEditorInput;
  /** Name of each sector, by id (from the sectors of the aqueduct). */
  readonly sectorNames: ReadonlyMap<string, string>;
  readonly bounds: EditorBounds;
  readonly isSaving: boolean;
  readonly failure: string | null;
  readonly onSubmit: (submit: EditorSubmit) => void;
  readonly onCancel: () => void;
}

/**
 * The editor of S14. It holds no rules of its own: it renders the mediator's state, forwards the
 * person's changes to it, and on submit moves the focus to the first problem.
 */
export function ProposalEditorForm({
  input,
  sectorNames,
  bounds,
  isSaving,
  failure,
  onSubmit,
  onCancel,
}: ProposalEditorFormProps): JSX.Element {
  const [mediator] = useState(() => new ProposalEditorMediator(input));
  const state = useEditorState(mediator);
  const [attempted, setAttempted] = useState(false);
  const shiftInputs = useRef(new Map<string, HTMLInputElement>());
  const reasonInput = useRef<HTMLTextAreaElement>(null);

  const problemsOf = (sectorId: string): string[] => {
    const shift = state.shifts.find((item) => item.sectorId === sectorId);
    return (shift?.issues ?? []).map((issue) => shiftIssueText(issue, bounds));
  };
  // An empty reason is only a problem once the person tried to save (no nagging while typing).
  const reasonProblem =
    state.reasonIssue === null || (state.reason.length === 0 && !attempted)
      ? null
      : reasonIssueText(state.reasonIssue, bounds);
  const totalProblem = state.errors.length === 0 ? null : totalExceedsText(bounds);

  const submit = (): void => {
    if (!state.canSubmit) {
      setAttempted(true);
      focusFirstProblem();
      return;
    }
    onSubmit({ mediator, state });
  };

  /** Focus goes to the first shift with a problem, then to the reason. */
  const focusFirstProblem = (): void => {
    const withIssue = state.shifts.find((shift) => shift.issues.length > 0);
    const first = withIssue ?? (totalProblem === null ? undefined : state.shifts[0]);
    if (first !== undefined) {
      shiftInputs.current.get(first.sectorId)?.focus();
      return;
    }
    reasonInput.current?.focus();
  };

  return (
    <form
      noValidate
      className={cn(styles.form)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p aria-live="polite" className={cn(styles.total)}>
        {t('proposals.editor.total', {
          total: formatDecimal(state.totalHours, 1),
          available: formatDecimal(state.availableHours, 1),
        })}
      </p>
      {totalProblem === null ? null : (
        <p role="alert" className={cn(styles.error)}>
          {totalProblem}
        </p>
      )}
      {state.shifts.map((shift) => (
        <ShiftHoursField
          key={shift.sectorId}
          sectorName={sectorNames.get(shift.sectorId) ?? t('proposals.unknownSector')}
          hours={shift.hours}
          originalHours={shift.originalHours}
          maxHours={bounds.maxShiftHours}
          problems={problemsOf(shift.sectorId)}
          onChange={(hours) => {
            mediator.setHours(shift.sectorId, hours);
          }}
          inputRef={(element) => {
            if (element === null) {
              shiftInputs.current.delete(shift.sectorId);
            } else {
              shiftInputs.current.set(shift.sectorId, element);
            }
          }}
        />
      ))}
      <TextAreaField
        ref={reasonInput}
        label={t('proposals.editor.reasonLabel')}
        hint={t('proposals.editor.reasonHint')}
        error={reasonProblem ?? undefined}
        length={state.reason.length}
        maxLength={bounds.reasonMax}
        counterText={(length, max) =>
          t('publicReport.counter', { length: String(length), max: String(max) })
        }
        value={state.reason}
        onChange={(event) => {
          mediator.setReason(event.currentTarget.value);
        }}
      />
      {attempted && !state.canSubmit ? (
        <FormAlert message={t('proposals.editor.firstError')} />
      ) : null}
      {!state.changed ? <p className={cn(styles.hint)}>{t('proposals.editor.noChanges')}</p> : null}
      {failure === null ? null : <FormAlert message={failure} />}
      <div className={cn(styles.actions)}>
        <Button
          type="submit"
          variant="primary"
          aria-disabled={!state.canSubmit || isSaving}
          disabled={isSaving}
        >
          {isSaving ? t('proposals.saving') : t('proposals.editor.save')}
        </Button>
        <Button onClick={onCancel}>{t('proposals.editor.cancel')}</Button>
      </div>
    </form>
  );
}
