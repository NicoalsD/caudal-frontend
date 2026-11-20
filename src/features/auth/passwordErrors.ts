import { DomainError } from '../../core/errors/DomainError';
import { httpStatusOf } from '../../core/errors/httpInfo';
import { FIELD } from '../../core/forms/formSchemas';
import { errorText } from '../../i18n/errorText';
import { t } from '../../i18n/t';

const UNAUTHORIZED_STATUS = 401;
const POLICY_VIOLATION_CODE = 'PASSWORD_POLICY_VIOLATION';

export interface PasswordFailure {
  /** The field the message belongs to, or null for a message about the whole form. */
  readonly field: typeof FIELD.currentPassword | typeof FIELD.newPassword | null;
  readonly message: string;
  readonly supportCode: string | null;
}

/**
 * Maps a failed change-password call to a message and the field that caused it.
 * A 401 here means the current password is wrong: AuthHttpClient already tried to renew the
 * session once, so the token was good.
 */
export function passwordFailure(error: unknown): PasswordFailure {
  if (httpStatusOf(error) === UNAUTHORIZED_STATUS) {
    return {
      field: FIELD.currentPassword,
      message: t('auth.wrongCurrentPassword'),
      supportCode: null,
    };
  }
  if (error instanceof DomainError && error.code === POLICY_VIOLATION_CODE) {
    return {
      field: FIELD.newPassword,
      message: t('errors.api.passwordPolicyViolation'),
      supportCode: null,
    };
  }
  const text = errorText(error);
  return { field: null, message: text.message, supportCode: text.supportCode };
}
