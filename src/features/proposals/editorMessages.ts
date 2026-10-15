import type { ReasonIssueCode, ShiftIssueCode } from '../../core/proposal/ProposalEditorMediator';
import { formatDecimal } from '../../core/format/decimal';
import { t } from '../../i18n/t';
import { hoursText } from './hoursText';

export interface EditorBounds {
  readonly availableHours: number;
  readonly minShiftHours: number;
  readonly maxShiftHours: number;
  readonly reasonMin: number;
  readonly reasonMax: number;
}

/** The plain-words text of a shift problem, next to its field (screens.md S14). */
export function shiftIssueText(issue: ShiftIssueCode, bounds: EditorBounds): string {
  switch (issue) {
    case 'SHIFT_BELOW_MIN':
      return t('proposals.editor.shiftBelowMin', { min: hoursText(bounds.minShiftHours) });
    case 'SHIFT_ABOVE_MAX':
      return t('proposals.editor.shiftAboveMax', { max: hoursText(bounds.maxShiftHours) });
    case 'OUTSIDE_WINDOW':
      return t('proposals.editor.outsideWindow');
  }
}

/** The text of the reason problem, with the limits the server sent (constraints "reason"). */
export function reasonIssueText(
  issue: ReasonIssueCode,
  bounds: Pick<EditorBounds, 'reasonMin' | 'reasonMax'>,
): string {
  switch (issue) {
    case 'REASON_REQUIRED':
      return t('proposals.editor.reasonRequired', { min: String(bounds.reasonMin) });
    case 'REASON_TOO_SHORT':
      return t('proposals.editor.reasonTooShort', { min: String(bounds.reasonMin) });
    case 'REASON_TOO_LONG':
      return t('proposals.editor.reasonTooLong', { max: String(bounds.reasonMax) });
  }
}

/** The total of the shifts is above the hours the day has. */
export function totalExceedsText(bounds: EditorBounds): string {
  return t('proposals.editor.totalExceeds', {
    available: formatDecimal(bounds.availableHours, 1),
  });
}
