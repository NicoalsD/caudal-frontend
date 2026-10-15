import { DomainError } from '../../core/errors/DomainError';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const CONFLICT = 'CONFLICT';
const INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION';
/** Conflicts name their cause in details.reason (API.md 1.4 and 3.6). */
const REASON = 'reason';
const SELF_LOCKOUT = 'SELF_LOCKOUT';
const MEMBERSHIP_OVERLAP = 'MEMBERSHIP_OVERLAP';

/**
 * The text for a failed change of an account. `conflictText` is the text of a conflict without a
 * known reason (for example a user that already exists when creating).
 */
export function userErrorMessage(error: unknown, conflictText: string): string {
  if (error instanceof DomainError) {
    const reason = error.details[REASON];
    if (error.code === CONFLICT && reason === SELF_LOCKOUT) {
      return t('users.errors.selfLockout');
    }
    if (error.code === CONFLICT && reason === MEMBERSHIP_OVERLAP) {
      return t('users.errors.membershipOverlap');
    }
    if (error.code === CONFLICT) {
      return conflictText;
    }
    if (error.code === INVALID_STATE_TRANSITION) {
      return t('users.errors.disabledAccount');
    }
  }
  return errorText(error).message;
}
