import { useId, useState } from 'react';
import type { JSX, Ref } from 'react';

import { HOURS_STEP } from '../../core/proposal/ProposalEditorMediator';
import { t } from '../../i18n/t';
import { cn } from '../../ui/styles/cn';
import { hoursText } from './hoursText';
import styles from './ProposalEditor.module.css';

const ZERO_HOURS = 0;

interface ShiftHoursFieldProps {
  readonly sectorName: string;
  readonly hours: number;
  readonly originalHours: number;
  /** Largest value the slider and the field accept (the rule set's maximum shift). */
  readonly maxHours: number;
  /** Plain-words problems of this shift, already translated. Empty when the shift is fine. */
  readonly problems: readonly string[];
  readonly onChange: (hours: number) => void;
  readonly inputRef?: Ref<HTMLInputElement>;
}

/**
 * One shift of the editor: a slider and a numeric field that always show the same value
 * (design-theme 8.1). The field carries the text of its problems through aria-describedby.
 */
export function ShiftHoursField({
  sectorName,
  hours,
  originalHours,
  maxHours,
  problems,
  onChange,
  inputRef,
}: ShiftHoursFieldProps): JSX.Element {
  const id = useId();
  const numberId = `${id}-number`;
  const errorId = `${id}-error`;
  const describedBy = problems.length === 0 ? undefined : errorId;
  // The field keeps what the person typed (an empty text is 0 hours), so it never fights the caret.
  const [draft, setDraft] = useState(String(hours));

  return (
    <div className={cn(styles.shift)}>
      <p className={cn(styles.sector)}>{sectorName}</p>
      <div className={cn(styles.controls)}>
        <input
          type="range"
          className={cn(styles.slider)}
          aria-label={t('proposals.editor.sliderOf', { sector: sectorName })}
          aria-describedby={describedBy}
          aria-invalid={problems.length === 0 ? undefined : true}
          min={0}
          max={maxHours}
          step={HOURS_STEP}
          value={hours}
          onChange={(event) => {
            const next = event.currentTarget.valueAsNumber;
            setDraft(String(next));
            onChange(next);
          }}
        />
        <label className={cn(styles.numberLabel)} htmlFor={numberId}>
          {t('proposals.editor.hoursOf', { sector: sectorName })}
        </label>
        <input
          id={numberId}
          ref={inputRef}
          type="number"
          className={cn(styles.number)}
          inputMode="decimal"
          min={0}
          max={maxHours}
          step={HOURS_STEP}
          value={draft}
          aria-describedby={describedBy}
          aria-invalid={problems.length === 0 ? undefined : true}
          onChange={(event) => {
            const typed = event.currentTarget.value;
            setDraft(typed);
            const next = event.currentTarget.valueAsNumber;
            onChange(Number.isFinite(next) ? next : ZERO_HOURS);
          }}
        />
      </div>
      <p className={cn(styles.original)}>
        {t('proposals.editor.original', { hours: hoursText(originalHours) })}
      </p>
      {problems.length === 0 ? null : (
        <p id={errorId} className={cn(styles.error)}>
          {problems.join(' ')}
        </p>
      )}
    </div>
  );
}
